import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';

import { Search, Bell, Home, Car, Plus } from 'lucide-react-native';
import { useAuth } from '@/context/UserContext';

export const HomeScreen = () => {
  const { user } = useAuth();
  console.log(user);
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {user?.displayName?.split(' ')[0] || 'User'}</Text>
        <TouchableOpacity style={styles.bell}>
          <Bell size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search property"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
        <Search size={20} color="#0f172a" />
      </View>

      {/* FILTERS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity style={styles.activeChip}>
          <Search size={14} color="#fff" />
          <Text style={styles.activeChipText}> All Property</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chip}>
          <Home size={14} color="#0f172a" />
          <Text style={styles.chipText}> Houses</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chip}>
          <Car size={14} color="#0f172a" />
          <Text style={styles.chipText}> Vehicles</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>New</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* MY PROPERTIES */}
      <Text style={styles.sectionTitle}>My properties</Text>

      {/* EMPTY STATE */}
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Plus size={32} color="#94a3b8" />
        </View>

        <Text style={styles.emptyText}>
          No property has not been added yet. Click the button below to add a property
        </Text>

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
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcome: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },

  bell: {
    padding: 6,
  },

  searchContainer: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  input: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
    color: '#0f172a',
  },

  filterContainer: {
    marginTop: 20,
    marginBottom: 10,
  },

  chip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  chipText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },

  activeChip: {
    backgroundColor: '#047857',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  activeChipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },

  badge: {
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },

  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },

  sectionTitle: {
    marginTop: 30,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
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
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginBottom: 20,
  },

  addButton: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },

  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
