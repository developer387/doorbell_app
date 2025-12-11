import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';

import { Search, Bell, Plus } from 'lucide-react-native';
import { useAuth } from '@/context/UserContext';
import { colors } from '@/styles/colors';
import { MediumText, Body, Heading } from '@/typography';
import { FilterChips } from '@components/FilterChip';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';
import { useUserProperties } from '@/hooks/useUserProperties';
import { Loading, PropertyCard } from '@/components';
import type { ChipItem } from '@/components/ScrollableChipList';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const chips: ChipItem[] = [
  { label: 'All Property', value: 'All Property' },
  { label: 'Houses', value: 'Houses', icon: '🏠' },
  { label: 'Vehicles', value: 'Vehicles', icon: '🚗', badge: 'New' },
];

export const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { properties, loading } = useUserProperties();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen to pending guest requests for this user
    const q = query(
      collection(db, 'guestRequests'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <Loading />

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Heading weight="bold" variant="black">
            Welcome, {user?.displayName?.split(' ')[0] ?? 'User'}
          </Heading>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={22} color="#0f172a" />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <MediumText variant="white" style={styles.notificationText}>
                  {notificationCount}
                </MediumText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search property"
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />
          <Search size={20} color="#0f172a" />
        </View>

        <FilterChips items={chips} />

        <Body style={styles.sectionTitle} weight="bolder">
          My properties
        </Body>

        {properties.length > 0 ? (
          properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Plus size={32} />
            </View>

            <MediumText style={styles.emptyText}>
              No property has not been added yet. Click the button below to add a property
            </MediumText>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProperty')}
            >
              <MediumText variant="white" weight="bold">Add Property +</MediumText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcome: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },

  bell: {
    padding: 6,
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  notificationText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  searchContainer: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: colors.borderColor,
  },

  input: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },

  sectionTitle: {
    marginVertical: 8,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  emptyIcon: {
    height: 80,
    width: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyText: {
    textAlign: 'center',
    marginBottom: 20,
  },

  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },

  addButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});
