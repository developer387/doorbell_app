import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '@/navigation-types';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { useAuth } from '@/context/UserContext';

type PropertyDetailsRouteProp = RouteProp<
  MainStackParamList,
  'PropertyDetails'
>;

const DetailRow = ({ label, value, isStatus = false }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    {isStatus ? (
      <View style={[styles.statusBadge, styles.activeStatus]}>
        <Text style={styles.statusText}>{value}</Text>
      </View>
    ) : (
      <Text style={styles.detailValue}>{value}</Text>
    )}
  </View>
);

export const PropertyDetails = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isGuestAccessEnabled, setIsGuestAccessEnabled] = useState(true);
  const route = useRoute<PropertyDetailsRouteProp>();
  const { propertyId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.mainTitle}>
            Family House <Text style={styles.emoji}>&#x1F3E0;</Text>
          </Text>
          <Text style={styles.addressLine} numberOfLines={1}>
            C.29 Sur 3117, Benito Julrez, 7240..
          </Text>
        </View>
      </View>
      <ScrollView style={styles.contentScroll}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <TouchableOpacity>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailsContent}>
            <DetailRow label="Category" value="House" />
            <DetailRow label="Property Name" value="Beach House" />
            <DetailRow label="Address" value="C.29 Sur 3117, Benito Julrez, 7240" />
            <DetailRow label="Status" value="Active" isStatus={true} />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={[styles.sectionContainer, styles.toggleSection]}>
          <View style={styles.textBlock}>
            <Text style={styles.sectionTitle}>Allow Guest Access</Text>
            <Text style={styles.descriptionText}>Property is now available to any guest</Text>
          </View>
          <Switch
            onValueChange={setIsGuestAccessEnabled}
            value={isGuestAccessEnabled}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isGuestAccessEnabled ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
        <View style={styles.divider} />
        <TouchableOpacity style={[styles.sectionContainer, styles.actionSection]}>
          <View style={styles.textBlock}>
            <Text style={styles.disconnectTitle}>Disconnect Door Bell</Text>
            <Text style={styles.disconnectDescription}>
              You will loose all the details about this property.
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // --- Header Styles ---
  headerContainer: {
    paddingTop: 50, // Simulate iPhone status bar height + padding
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleBlock: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 30,
  },
  closeButton: {
    padding: 4,
  },
  emoji: {
    fontSize: 20,
    marginLeft: 5,
  },
  addressLine: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // --- Content and Section Styles ---
  contentScroll: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: 16,
  },

  // Section Header (Property Details)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  editLink: {
    fontSize: 16,
    color: '#1E90FF', // Blue link color
    fontWeight: '600',
  },

  // Property Detail Rows
  detailsContent: {
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1, // Allows text to wrap if needed
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
  },
  activeStatus: {
    backgroundColor: '#E8F5E9', // Light green background
  },
  statusText: {
    color: '#4CAF50', // Green text color
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Divider
  divider: {
    height: 10,
    backgroundColor: '#f4f4f4',
    marginVertical: 10,
  },

  // Toggle Section (Guest Access)
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Action Section (Disconnect Door Bell)
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 50, // Push content up from the bottom bar
  },
  textBlock: {
    flex: 1,
    paddingRight: 10,
  },
  disconnectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF4500', // Reddish color for warning/disconnect
  },
  disconnectDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  arrowIcon: {
    fontSize: 20,
    color: '#ccc',
  },
});
