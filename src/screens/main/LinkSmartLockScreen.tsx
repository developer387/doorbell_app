import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type MainStackParamList } from '@navigation-types';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import empty from '../../../assets/empty.png';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteProps = RouteProp<MainStackParamList, 'LinkSmartLock'>;

export const LinkSmartLockScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { propertyId } = route.params;

  const handleSkip = () => {
    // Navigate to home or wherever appropriate
    navigation.navigate('MainTabs');
  };

  const handleAddBrand = () => {
    // TODO: Implement add brand logic
    console.log('Add Brand clicked for property:', propertyId);
  };

  const handleProceed = () => {
    // Navigate to home or wherever appropriate
    navigation.navigate('MainTabs');
  };

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

        <View style={styles.emptyStateContainer}>
          {/* Placeholder for the image in Figma */}
          <View style={styles.imagePlaceholder}>
            <Plus size={40} color="#cbd5e1" />
          </View>
          <Image src={empty} style={{ width: 139, height: 112 }} />
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
});
