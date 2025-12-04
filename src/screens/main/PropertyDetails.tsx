import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '@/navigation-types';
import { StyleSheet, View, TouchableOpacity, Switch, ScrollView, Image } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { useAuth } from '@/context/UserContext';
import { Title, Body, SmallText } from '@/typography';
import { type ChipItem, FilterChips, Loading } from '@/components';
import { useGetUserProperty } from '@/hooks';

type PropertyDetailsRouteProp = RouteProp<MainStackParamList, 'PropertyDetails'>;

const DetailRow = ({ label, value = '', isStatus = false }: { label: string; value?: string; isStatus?: boolean }) => (
  <View style={styles.detailRow}>
    <Body>{label}:</Body>
    {isStatus ? (
      <View style={[styles.statusBadge, styles.activeStatus]}>
        <Body variant="primary" weight="bolder">
          {value}
        </Body>
      </View>
    ) : (
      <Body variant="secondary"> {value}</Body>
    )}
  </View>
);

export const PropertyDetails = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [isGuestAccessEnabled, setIsGuestAccessEnabled] = useState(true);
  const route = useRoute<PropertyDetailsRouteProp>();
  const { propertyId } = route.params;

  const { property, loading } = useGetUserProperty(user?.uid, propertyId);


  const chips: ChipItem[] = [
    { label: 'Property Details', value: 'propertyDetails' },
    { label: 'Smart Locks', value: 'locks', count: property?.smartLocks?.length },
    { label: 'Requests', value: 'request', count: 1 },
  ];
  const [activeChip, setActiveChip] = useState(chips[0].value);

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <View>
          <Title>{property?.propertyName}</Title>
          <Body numberOfLines={1}> {property?.address}</Body>
          <FilterChips
            items={chips}
            activeItem={activeChip}
            onItemPress={(item) => setActiveChip(item.value)}
          />
        </View>
      </View>
      {activeChip === 'propertyDetails' && (
        <ScrollView style={styles.contentScroll}>
          <View>
            <View style={styles.sectionHeader}>
              <Body weight="bolder">Property Details</Body>
              <TouchableOpacity>
                <Body variant="primary">Edit</Body>
              </TouchableOpacity>
            </View>
            <View style={styles.detailsContent}>
              <DetailRow label="Category" value={property?.category} />
              <DetailRow label="Property Name" value={property?.propertyName} />
              <DetailRow label="Address" value={property?.address} />
              <DetailRow label="Status" value="Active" isStatus={true} />
            </View>
          </View>
          <View style={styles.toggleSection}>
            <View style={styles.textBlock}>
              <Body weight="bolder">Allow Guest Access</Body>
              <Body variant="secondary">Property is now available to any guest</Body>
            </View>
            <Switch
              onValueChange={setIsGuestAccessEnabled}
              value={isGuestAccessEnabled}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={isGuestAccessEnabled ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>
          <TouchableOpacity style={styles.actionSection}>
            <View style={styles.textBlock}>
              <Body variant="error">Disconnect Door Bell</Body>
              <SmallText variant="secondary">
                You will loose all the details about this property.
              </SmallText>
            </View>
          </TouchableOpacity>
        </ScrollView>

      )}
      {activeChip === 'locks' && (
        <ScrollView style={styles.contentScroll}>
          {property?.smartLocks && property.smartLocks.length > 0 ? (
            <View style={styles.locksContainer}>
              {/* Group locks by manufacturer */}
              {Object.entries(
                property.smartLocks.reduce((acc, lock) => {
                  const manufacturer = lock.manufacturer || 'Unknown';
                  if (!acc[manufacturer]) {
                    acc[manufacturer] = [];
                  }
                  acc[manufacturer].push(lock);
                  return acc;
                }, {} as Record<string, typeof property.smartLocks>)
              ).map(([manufacturer, locks]) => (
                <View key={manufacturer} style={styles.lockBrandCard}>
                  {/* Brand Header */}
                  <View style={styles.lockBrandHeader}>
                    <Body weight="bolder">{manufacturer}</Body>
                  </View>

                  {/* Locks List */}
                  {locks.map((lock) => (
                    <View key={lock.device_id} style={styles.lockItemRow}>
                      <View style={styles.lockItemLeft}>
                        <Image
                          source={require('../../../assets/remote.png')}
                          style={styles.lockItemIcon}
                          resizeMode="contain"
                        />
                        <View style={styles.lockItemInfo}>
                          <View style={styles.lockItemNameRow}>
                            <Body weight="bolder">{lock.display_name}</Body>
                            <Check size={16} color={colors.primary} strokeWidth={3} />
                          </View>
                          <SmallText variant="secondary">{manufacturer}</SmallText>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyLocksState}>
              <View style={styles.emptyLocksBrandSection}>
                <Body weight="bolder">Smart Lock Brand</Body>
                <TouchableOpacity onPress={() => navigation.navigate('LinkSmartLock', { propertyId })}>
                  <Body variant="primary">+ Add Brand</Body>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
      {activeChip === 'request' && (
        <Body>Requests</Body>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    gap: 8,
  },

  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 22,
    paddingTop: 50,
    paddingBottom: 8,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderColor,
  },

  contentScroll: {
    flex: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailsContent: {
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
  },
  activeStatus: {
    backgroundColor: colors.activeTagBg,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },

  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 50,
  },
  textBlock: {
    flex: 1,
    paddingRight: 10,
  },
  locksContainer: {
    paddingVertical: 8,
  },
  lockBrandCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  lockBrandHeader: {
    marginBottom: 12,
  },
  lockItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  lockItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lockItemIcon: {
    width: 40,
    height: 40,
  },
  lockItemInfo: {
    flex: 1,
  },
  lockItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyLocksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyLocksState: {
    paddingVertical: 8,
  },
  emptyLocksBrandSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
});
