import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '@/navigation-types';
import { StyleSheet, View, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { useAuth } from '@/context/UserContext';
import { Title, Body, SmallText } from '@/typography';
import { type ChipItem, FilterChips, Loading } from '@/components';
import { useGetUserProperty } from '@/hooks';

type PropertyDetailsRouteProp = RouteProp<MainStackParamList, 'PropertyDetails'>;

const chips: ChipItem[] = [
  { label: 'Property Details', value: 'propertyDetails' },
  { label: 'Smart Locks', value: 'locks', count: 4 },
  { label: 'Requests', value: 'request', count: 1 },
];

const DetailRow = ({ label, value, isStatus = false }) => (
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
  const navigation = useNavigation();
  const [isGuestAccessEnabled, setIsGuestAccessEnabled] = useState(true);
  const route = useRoute<PropertyDetailsRouteProp>();
  const { propertyId } = route.params;

  const { property, loading } = useGetUserProperty(user?.uid, propertyId);
  if (loading) return <Loading />


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <View>
          <Title>{property?.propertyName}</Title>
          <Body numberOfLines={1}> {property?.address}</Body>
          <FilterChips items={chips} />
        </View>
      </View>

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
        <View style={[styles.sectionContainer, styles.toggleSection]}>
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
        <TouchableOpacity style={[styles.sectionContainer, styles.actionSection]}>
          <View style={styles.textBlock}>
            <Body variant="error">Disconnect Door Bell</Body>
            <SmallText variant="secondary">
              You will loose all the details about this property.
            </SmallText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    gap: 24,
  },

  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 22,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderColor,
  },

  emoji: {
    fontSize: 20,
    marginLeft: 5,
  },

  // --- Content and Section Styles ---
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
});
