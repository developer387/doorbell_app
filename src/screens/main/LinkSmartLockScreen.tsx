import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type MainStackParamList } from '@navigation-types';
import { ArrowLeft, Search, ChevronRight, X } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { BottomSheet } from '@/components/BottomSheet';
import { WebView } from 'react-native-webview';
import { seamService, type SeamBrand } from '@/services/seam.service';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteProps = RouteProp<MainStackParamList, 'LinkSmartLock'>;

export const LinkSmartLockScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { propertyId } = route.params;

  const [brands, setBrands] = useState<SeamBrand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<SeamBrand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectWebviewUrl, setConnectWebviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setFilteredBrands(
      brands.filter((brand) =>
        brand.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, brands]);

  const handleSkip = () => {
    navigation.navigate('MainTabs');
  };

  const handleAddBrand = () => {
    fetchBrands();
    setIsBottomSheetVisible(true);
  };

  const fetchBrands = () => {
    setIsLoading(true);
    setError(null);

    seamService
      .getDeviceProviders()
      .then((fetchedBrands) => {
        console.log('Fetched Seam brands:', fetchedBrands);
        setBrands(fetchedBrands);
        setFilteredBrands(fetchedBrands);
      })
      .catch((err) => {
        console.error('Error fetching brands:', err);
        setError('Failed to load brands. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleBrandClick = (brand: SeamBrand) => {
    setIsBottomSheetVisible(false);
    setIsLoading(true);
    setError(null);

    seamService
      .createConnectWebview(brand.key)
      .then((webview) => {
        console.log('Connect webview URL:', webview.url);
        setConnectWebviewUrl(webview.url);
      })
      .catch((err) => {
        console.error('Error creating connect webview:', err);
        setError('Failed to create connection. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCloseWebView = () => {
    setConnectWebviewUrl(null);
  };

  const handleProceed = () => {
    navigation.navigate('MainTabs');
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

      <View style={styles.content}>
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
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
          <Text style={styles.proceedButtonText}>Proceed</Text>
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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.brandList}>
              {filteredBrands.map((brand) => (
                <TouchableOpacity
                  key={brand.key}
                  style={styles.brandItem}
                  onPress={() => handleBrandClick(brand)}
                >
                  <View style={styles.brandInfo}>
                    <View style={styles.brandIconPlaceholder}>
                      <Text style={styles.brandIconText}>
                        {brand.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.brandName}>{brand.display_name}</Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))}
              {filteredBrands.length === 0 && !isLoading && (
                <Text style={styles.noBrandsText}>No brands found</Text>
              )}
            </View>
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
  imagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
});

