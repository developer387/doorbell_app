import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type MainStackParamList } from '@navigation-types';
import { ArrowLeft, Search, ChevronRight, X, Check } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { BottomSheet } from '@/components/BottomSheet';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { seamService, type SeamBrand, type Lock } from '@/services/seam.service';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/UserContext';
import { type SeamDevice } from '@/types';
import { Body } from '@/typography';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteProps = RouteProp<MainStackParamList, 'LinkSmartLock'>;

export const LinkSmartLockScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { propertyId } = route.params;
  const { user } = useAuth();

  const [availableBrands, setAvailableBrands] = useState<SeamBrand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<SeamBrand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectWebviewUrl, setConnectWebviewUrl] = useState<string | null>(null);
  const [connectWebviewId, setConnectWebviewId] = useState<string | null>(null);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [groupedDevices, setGroupedDevices] = useState<Record<string, SeamDevice[]>>({});
  const [brandImages, setBrandImages] = useState<Record<string, string>>({});
  const [linkedLockIds, setLinkedLockIds] = useState<Set<string>>(new Set());
  const [editingLockId, setEditingLockId] = useState<string | null>(null);
  const [editingLockName, setEditingLockName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchExistingDevices();
  }, []);

  useEffect(() => {
    // Filter brands based on search query
    if (searchQuery.trim() === '') {
      setFilteredBrands(availableBrands);
    } else {
      const filtered = availableBrands.filter((brand) =>
        brand.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBrands(filtered);
    }
  }, [searchQuery, availableBrands]);

  const handleSkip = () => {
    navigation.navigate('MainTabs');
  };

  const handleAddBrand = () => {
    fetchAvailableBrands();
    setIsBottomSheetVisible(true);
  };

  const fetchExistingDevices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const devices = await seamService.getDeviceProviders();
      console.log('Fetched existing devices:', devices);

      // Group devices by manufacturer and extract image URLs
      const grouped: Record<string, SeamDevice[]> = {};
      const images: Record<string, string> = {};

      devices.forEach((device) => {
        const manufacturer = device.properties.manufacturer || 'Unknown';
        if (!grouped[manufacturer]) {
          grouped[manufacturer] = [];
        }
        grouped[manufacturer].push(device);

        // Store the first image URL we find for this manufacturer
        if (!images[manufacturer] && device.properties.image_url) {
          images[manufacturer] = device.properties.image_url;
        }
      });

      setGroupedDevices(grouped);
      setBrandImages(images);

      // Convert devices to Lock format for compatibility
      const locksData: Lock[] = devices.map((device) => ({
        device_id: device.device_id,
        device_type: device.device_type,
        display_name: device.properties.name || device.display_name,
        manufacturer: device.properties.manufacturer,
        properties: {
          name: device.properties.name,
          manufacturer: device.properties.manufacturer,
          online: device.properties.online,
          locked: device.properties.locked,
        },
        connected_account_id: device.connected_account_id,
      }));

      setLocks(locksData);
    } catch (err) {
      console.error('Error fetching existing devices:', err);
      setError('Failed to load devices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableBrands = async () => {
    setIsLoadingBrands(true);
    setError(null);

    try {
      const brands = await seamService.getBrandProviders();
      console.log('Fetched available brands:', brands);
      setAvailableBrands(brands);
      setFilteredBrands(brands);
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError('Failed to load brands. Please try again.');
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const handleBrandClick = (brand: SeamBrand) => {
    setIsBottomSheetVisible(false);
    setIsLoading(true);
    setError(null);

    seamService
      .createConnectWebview(brand.key)
      .then((webview) => {
        console.log('Connect webview created:', webview);
        setConnectWebviewUrl(webview.url);
        setConnectWebviewId(webview.connect_webview_id);
      })
      .catch((err) => {
        console.error('Error creating connect webview:', err);
        setError('Failed to create connection. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleWebViewNavigationStateChange = (navState: WebViewNavigation) => {
    console.log('WebView navigation:', navState);

    // Check if the URL indicates completion
    if (navState.url.includes('success') || navState.url.includes('authorized')) {
      console.log('Authentication appears complete, checking status...');
      checkWebviewStatusAndFetchDevices();
    }
  };

  const checkWebviewStatusAndFetchDevices = async () => {
    if (!connectWebviewId) return;

    try {
      setIsLoading(true);

      // Poll for webview status
      let attempts = 0;
      const maxAttempts = 10;

      const checkStatus = async (): Promise<boolean> => {
        try {
          const webview = await seamService.getConnectWebviewStatus(connectWebviewId);
          console.log('Webview status:', webview.status);

          if (webview.status === 'authorized') {
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error checking webview status:', error);
          return false;
        }
      };

      while (attempts < maxAttempts) {
        const isAuthorized = await checkStatus();

        if (isAuthorized) {
          console.log('Webview authorized! Fetching devices...');
          setConnectWebviewUrl(null);
          setConnectWebviewId(null);

          // Refresh the device list
          await fetchExistingDevices();

          Alert.alert('Success', 'Brand connected successfully! Your devices are now available.');
          break;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
      }

      if (attempts >= maxAttempts) {
        throw new Error('Timeout waiting for authorization');
      }
    } catch (error) {
      console.error('Error checking webview status:', error);
      Alert.alert('Error', 'Failed to complete authentication. Please try again.');
      setConnectWebviewUrl(null);
      setConnectWebviewId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseWebView = () => {
    setConnectWebviewUrl(null);
    setConnectWebviewId(null);
  };

  const handleToggleLinkLock = (lockId: string) => {
    setLinkedLockIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lockId)) {
        newSet.delete(lockId);
      } else {
        newSet.add(lockId);
      }
      return newSet;
    });
  };

  const handleRemoveBrand = (manufacturer: string) => {
    Alert.alert(
      'Remove Brand',
      `Are you sure you want to remove all ${manufacturer} devices?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Remove all devices from this manufacturer
            const devicesToRemove = groupedDevices[manufacturer] || [];
            const deviceIdsToRemove = new Set(devicesToRemove.map(d => d.device_id));

            // Remove from grouped devices
            const newGroupedDevices = { ...groupedDevices };
            delete newGroupedDevices[manufacturer];
            setGroupedDevices(newGroupedDevices);

            // Remove from locks
            setLocks(prevLocks => prevLocks.filter(lock => !deviceIdsToRemove.has(lock.device_id)));

            // Remove from linked locks
            setLinkedLockIds(prev => {
              const newSet = new Set(prev);
              deviceIdsToRemove.forEach(id => newSet.delete(id));
              return newSet;
            });
          },
        },
      ]
    );
  };

  const handleStartEditLock = (lock: Lock) => {
    setEditingLockId(lock.device_id);
    setEditingLockName(lock.display_name);
  };

  const handleSaveEditLock = () => {
    if (!editingLockId) return;

    setLocks((prevLocks) =>
      prevLocks.map((lock) =>
        lock.device_id === editingLockId
          ? { ...lock, display_name: editingLockName }
          : lock
      )
    );

    setEditingLockId(null);
    setEditingLockName('');
  };

  const handleProceed = async () => {
    if (linkedLockIds.size === 0) {
      Alert.alert('No Locks Selected', 'Please link at least one lock or skip this step.');
      return;
    }

    try {
      setIsSaving(true);

      // Get the linked locks
      const linkedLocks = locks
        .filter((lock) => linkedLockIds.has(lock.device_id))
        .map((lock) => ({
          device_id: lock.device_id,
          display_name: lock.display_name,
          device_type: lock.device_type,
          manufacturer: lock.manufacturer,
          connected_account_id: lock.connected_account_id,
        }));

      // Find the property document
      const propertiesRef = collection(db, 'properties');
      const q = query(
        propertiesRef,
        where('propertyId', '==', propertyId),
        where('userId', '==', user?.uid)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Property not found');
      }

      const propertyDoc = querySnapshot.docs[0];

      // Update the property with linked locks
      await updateDoc(propertyDoc.ref, {
        smartLocks: linkedLocks,
      });

      console.log('Successfully saved locks to property:', propertyId);
      Alert.alert('Success', 'Smart locks have been linked to your property!', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (error) {
      console.error('Error saving locks:', error);
      Alert.alert('Error', 'Failed to save locks. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (connectWebviewUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCloseWebView} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>Connect Your Lock</Text>
          <TouchableOpacity onPress={handleCloseWebView}>
            <X size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: connectWebviewUrl }}
          style={styles.webview}
          startInLoadingState={true}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Link Your Smart Lock</Text>
        <Text style={styles.subtitle}>You can do it now or later</Text>

        <View style={styles.brandSection}>
          <Text style={styles.sectionTitle}>Smart Lock Brand</Text>
          <TouchableOpacity onPress={handleAddBrand}>
            <Text style={styles.addBrandText}>+ Add Brand</Text>
          </TouchableOpacity>
        </View>

        {isLoading && !isBottomSheetVisible && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading devices...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {Object.keys(groupedDevices).length === 0 && !isLoading && (
          <View style={styles.emptyStateContainer}>
            <Image
              source={require('../../../assets/empty.png')}
              style={{ width: 139, height: 112, marginBottom: 16 }}
            />
            <Text style={styles.emptyStateText}>No Brand has been added yet.</Text>
            <Text style={styles.emptyStateSubtext}>Click the button below to add a Brand</Text>

            <TouchableOpacity style={styles.addBrandButton} onPress={handleAddBrand}>
              <Text style={styles.addBrandButtonText}>Add Brand +</Text>
            </TouchableOpacity>
          </View>
        )}

        {Object.keys(groupedDevices).length > 0 && (
          <View style={styles.brandsListContainer}>
            {Object.entries(groupedDevices).map(([manufacturer, devices]) => (
              <View key={manufacturer} style={styles.brandGroupContainer}>
                <View style={styles.brandGroupHeader}>
                  <View style={styles.brandHeaderLeft}>
                    {brandImages[manufacturer] ? (
                      <Image
                        source={{ uri: brandImages[manufacturer] }}
                        style={styles.brandLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.brandIconPlaceholder}>
                        <Text style={styles.brandIconText}>
                          {manufacturer.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.brandGroupName}>{manufacturer}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveBrand(manufacturer)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.selectLocksText}>
                  Select the Smart Lock(s) you want to connect
                </Text>

                {devices.map((device) => {
                  const lock = locks.find(l => l.device_id === device.device_id);
                  if (!lock) return null;

                  return (
                    <View key={device.device_id} style={styles.lockItem}>
                      <View style={styles.lockInfo}>
                        <View style={styles.lockIconContainer}>
                          <Text style={styles.lockIconText}>🔒</Text>
                        </View>
                        <View style={styles.lockDetails}>
                          {editingLockId === device.device_id ? (
                            <TextInput
                              style={styles.lockNameInput}
                              value={editingLockName}
                              onChangeText={setEditingLockName}
                              onBlur={handleSaveEditLock}
                              autoFocus
                            />
                          ) : (
                            <TouchableOpacity onPress={() => handleStartEditLock(lock)}>
                              <Text style={styles.lockName}>{lock.display_name}</Text>
                            </TouchableOpacity>
                          )}
                          <Text style={styles.lockManufacturer}>{manufacturer}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.addLockButton,
                          linkedLockIds.has(device.device_id) && styles.addLockButtonActive,
                        ]}
                        onPress={() => handleToggleLinkLock(device.device_id)}
                      >
                        {linkedLockIds.has(device.device_id) ? (
                          <Check size={20} color={colors.primary} />
                        ) : (
                          <Text style={styles.addLockButtonText}>+</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.proceedButton,
            linkedLockIds.size > 0 && styles.proceedButtonActive,
          ]}
          onPress={handleProceed}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text
              style={[
                styles.proceedButtonText,
                linkedLockIds.size > 0 && styles.proceedButtonTextActive,
              ]}
            >
              {linkedLockIds.size > 0 ? `Link ${linkedLockIds.size} Lock(s)` : 'Proceed'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <BottomSheet
        isVisible={isBottomSheetVisible}
        onClose={() => setIsBottomSheetVisible(false)}
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Select a brand</Text>
            <TouchableOpacity onPress={() => setIsBottomSheetVisible(false)}>
              <X size={24} color={colors.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Smart lock brand"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.poweredBy}>
            <Text style={styles.poweredByText}>Powered by</Text>
            <Text style={styles.seamText}>seam</Text>
          </View>

          {isLoadingBrands ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView style={styles.brandList}>
              {filteredBrands.map((brand) => (
                <TouchableOpacity
                  key={brand.key}
                  style={styles.brandItem}
                  onPress={() => handleBrandClick(brand)}
                >
                  <View style={styles.brandInfo}>
                    {brand.icon_url ? (
                      <Image
                        source={{ uri: brand.icon_url }}
                        style={styles.brandLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.brandIconPlaceholder}>
                        <Text style={styles.brandIconText}>
                          {brand.display_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Body style={styles.brandName} tail>{brand.display_name}</Body>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))}
              {filteredBrands.length === 0 && !isLoadingBrands && (
                <Text style={styles.noBrandsText}>No brands found</Text>
              )}
            </ScrollView>
          )}
        </View>
      </BottomSheet>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  skipText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  webviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  webview: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  brandSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  addBrandText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  addBrandButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBrandButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  proceedButton: {
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomSheetContent: {
    paddingBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.dark,
  },
  poweredBy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  seamText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },
  brandList: {
    gap: 8,
  },
  brandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  brandIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.dark,
  },
  noBrandsText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  lockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  lockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  lockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconText: {
    fontSize: 24,
  },
  lockDetails: {
    flex: 1,
  },
  lockName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  lockNameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
    marginBottom: 4,
  },
  lockManufacturer: {
    fontSize: 14,
    color: '#64748b',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  linkButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  linkButtonTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  proceedButtonActive: {
    backgroundColor: colors.primary,
  },
  proceedButtonTextActive: {
    color: colors.white,
  },
  brandsListContainer: {
    marginTop: 20,
  },
  brandGroupContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  brandGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandGroupName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  selectLocksText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  addLockButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLockButtonActive: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },
  addLockButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
});

