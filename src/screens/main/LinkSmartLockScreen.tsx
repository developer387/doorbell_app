import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type MainStackParamList } from '@navigation-types';
import { ArrowLeft, Search, ChevronRight, X, Check, Plus, Link2Off } from 'lucide-react-native';
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
  const [isSaving, setIsSaving] = useState(false);
  const [removeBrandModal, setRemoveBrandModal] = useState<string | null>(null);

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
    setRemoveBrandModal(manufacturer);
  };

  const confirmRemoveBrand = () => {
    if (!removeBrandModal) return;

    const manufacturer = removeBrandModal;

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

    setRemoveBrandModal(null);
  };

  const handleProceed = async () => {
    if (linkedLockIds.size === 0) {
      // Allow proceeding without linking locks
      navigation.navigate('MainTabs');
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
      navigation.navigate('MainTabs');
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

        {/* Brand Groups */}
        {Object.keys(groupedDevices).length > 0 && (
          <View style={styles.brandsListContainer}>
            {Object.entries(groupedDevices).map(([manufacturer, devices]) => (
              <View key={manufacturer} style={styles.brandCard}>
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                  <View style={styles.brandTitleRow}>
                    {brandImages[manufacturer] ? (
                      <Image
                        source={{ uri: brandImages[manufacturer] }}
                        style={styles.brandIcon}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.brandIconPlaceholder}>
                        <Text style={styles.brandIconText}>
                          {manufacturer.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.brandName}>{manufacturer}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveBrand(manufacturer)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                {/* Locks Selection Text */}
                <Text style={styles.selectText}>
                  Select the Smart Lock(s) you want to connect
                </Text>

                {/* Locks List */}
                {devices.map((device) => {
                  const lock = locks.find(l => l.device_id === device.device_id);
                  if (!lock) return null;

                  const isLinked = linkedLockIds.has(device.device_id);

                  return (
                    <View key={device.device_id} style={styles.lockRow}>
                      <View style={styles.lockLeft}>
                        <Image
                          source={require('../../../assets/remote.png')}
                          style={styles.lockIcon}
                          resizeMode="contain"
                        />
                        <View style={styles.lockInfo}>
                          <View style={styles.lockNameRow}>
                            <Text style={styles.lockName}>
                              {lock.display_name}
                            </Text>
                            {isLinked && (
                              <Check size={16} color={colors.primary} strokeWidth={3} />
                            )}
                          </View>
                          <Text style={styles.lockSubtext}>{manufacturer}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isLinked && styles.unlinkButton,
                        ]}
                        onPress={() => handleToggleLinkLock(device.device_id)}
                      >
                        {isLinked ? (
                          <Link2Off size={20} color="#EF4444" strokeWidth={2.5} />
                        ) : (
                          <Plus size={20} color={colors.dark} strokeWidth={2.5} />
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

      {/* Proceed Button */}
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
              Proceed
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet for Brand Selection */}
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
                    <Body style={styles.brandListName}>{brand.display_name}</Body>
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

      {/* Remove Brand Confirmation Modal */}
      <Modal
        visible={removeBrandModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRemoveBrandModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Oops!</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove this brand?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setRemoveBrandModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRemoveButton}
                onPress={confirmRemoveBrand}
              >
                <Text style={styles.modalRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  skipText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '400',
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
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
  },
  brandSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  addBrandText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
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
  brandsListContainer: {
    marginBottom: 20,
  },
  brandCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 24,
    height: 24,
  },
  brandIconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#EF4444',
  },
  selectText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  lockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  lockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lockIcon: {
    width: 40,
    height: 40,
  },
  lockInfo: {
    flex: 1,
  },
  lockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  lockSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.dark,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlinkButton: {
    borderColor: '#EF4444',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.white,
  },
  proceedButton: {
    backgroundColor: '#D1D5DB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonActive: {
    backgroundColor: colors.primary,
  },
  proceedButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButtonTextActive: {
    color: colors.white,
  },
  // Bottom Sheet Styles
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
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  brandListName: {
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  modalRemoveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalRemoveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
