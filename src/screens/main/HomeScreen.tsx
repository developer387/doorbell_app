import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';

import { Search, Bell, Plus } from 'lucide-react-native';
import { useAuth } from '@/context/UserContext';
import { colors } from '@/styles/colors';
import { MediumText, Body } from '@/typography';
import { FilterChips } from '@components/FilterChip';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';
import { useUserProperties } from '@/hooks/useUserProperties';
import { ActivityIndicator } from 'react-native';
import { PropertyCard } from '@/components';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const { properties, loading } = useUserProperties();

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.welcome}>
            Welcome, {user?.displayName?.split(' ')[0] ?? 'User'}
          </Text>
          <TouchableOpacity style={styles.bell}>
            <Bell size={22} color="#0f172a" />
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

        <FilterChips />

        <Body style={styles.sectionTitle} weight="bolder">
          My properties
        </Body>

        {properties.length > 0 ? (
          properties.map((property) => (
            <PropertyCard key={property.propertyId} property={property} />
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
              <Text style={styles.addButtonText}>Add Property +</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
