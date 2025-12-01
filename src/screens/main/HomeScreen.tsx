import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { Search, Bell, Plus } from 'lucide-react-native';
import { useAuth } from '@/context/UserContext';
import { colors } from '@/styles/colors';
import { MediumText } from '@/typography';
import { FilterChips } from '@components/FilterChip';

export const HomeScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {user?.displayName?.split(' ')[0] ?? 'User'}</Text>
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

      {/* MY PROPERTIES */}
      <Text style={styles.sectionTitle}>My properties</Text>

      {/* EMPTY STATE */}
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Plus size={32}/>
        </View>

        <MediumText style={styles.emptyText}>
          No property has not been added yet. Click the button below to add a property
        </MediumText>

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Property +</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
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
  },

  filterContent: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 10,
    paddingVertical: 12
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

  chip: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },

  chipIcon: {
    fontSize: 12,
    marginRight: 3,
  },

  activeChip: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
    marginRight: 5,
  },

  activeChipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },

  badge: {
    backgroundColor: colors.tag,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 5,
  },

  sectionTitle: {
    marginTop: 30,
    fontSize: 16,
    fontWeight: '600'
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
