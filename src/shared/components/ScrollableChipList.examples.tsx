import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrollableChipList, ChipItem } from '@/components';
import { Home, Building, Car } from 'lucide-react-native';

/**
 * Example usage of ScrollableChipList component
 * This file demonstrates different ways to use the component
 */

export const ScrollableChipListExamples = () => {
    // Example 1: Simple chip list with emojis
    const propertyTypes: ChipItem[] = [
        { label: 'All Properties' },
        { label: 'Houses', icon: '🏠' },
        { label: 'Apartments', icon: '🏢' },
        { label: 'Vehicles', icon: '🚗', badge: 'New' },
        { label: 'Offices', icon: '🏪' },
        { label: 'Warehouses', icon: '🏭' },
    ];

    // Example 2: Chip list with Lucide icons and counts
    const statusChips: ChipItem[] = [
        { label: 'All', value: 'all', count: 24 },
        { label: 'Active', value: 'active', icon: Home, count: 12 },
        { label: 'Pending', value: 'pending', icon: Building, count: 5 },
        { label: 'Inactive', value: 'inactive', icon: Car, count: 7 },
    ];

    // Example 3: Chip list with custom values
    const categoryChips: ChipItem[] = [
        { label: 'Property Details', value: 'details', icon: '📋' },
        { label: 'Smart Locks', value: 'locks', icon: '🔒', count: 3 },
        { label: 'Requests', value: 'requests', icon: '📨', count: 1, badge: 'New' },
    ];

    const handleChipPress = (item: ChipItem) => {
        console.log('Chip pressed:', item);
    };

    return (
        <View style={styles.container}>
            {/* Example 1: Outlined style (default) */}
            {/*<ScrollableChipList*/}
            {/*    items={propertyTypes}*/}
            {/*    onItemPress={handleChipPress}*/}
            {/*    buttonType="outlined"*/}
            {/*/>*/}

            {/* Example 2: Filled style with counts */}
            <ScrollableChipList
                items={statusChips}
                onItemPress={handleChipPress}
                buttonType="filled"
                showCounts={true}
                // containerStyle={{ marginTop: 16 }}
            />

            {/*/!* Example 3: Minimal style *!/*/}
            {/*<ScrollableChipList*/}
            {/*    items={categoryChips}*/}
            {/*    onItemPress={handleChipPress}*/}
            {/*    buttonType="minimal"*/}
            {/*    showCounts={true}*/}
            {/*    showBadges={true}*/}
            {/*    containerStyle={{ marginTop: 16 }}*/}
            {/*/>*/}

            {/*/!* Example 4: Custom styling *!/*/}
            {/*<ScrollableChipList*/}
            {/*    items={propertyTypes}*/}
            {/*    onItemPress={handleChipPress}*/}
            {/*    buttonType="outlined"*/}
            {/*    chipStyle={{ borderRadius: 20 }}*/}
            {/*    activeChipStyle={{ backgroundColor: '#10b981' }}*/}
            {/*    containerStyle={{ marginTop: 16 }}*/}
            {/*/>*/}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: 20,
    },
});

/**
 * USAGE GUIDE:
 *
 * Basic Usage:
 * ------------
 * import { ScrollableChipList, ChipItem } from '@/components';
 *
 * const items: ChipItem[] = [
 *   { label: 'All' },
 *   { label: 'Houses', icon: '🏠' },
 *   { label: 'Cars', icon: '🚗', count: 5 },
 * ];
 *
 * <ScrollableChipList items={items} />
 *
 *
 * Props:
 * ------
 * - items: ChipItem[] (required) - Array of items to display
 * - activeItem?: string - Currently active item value
 * - onItemPress?: (item: ChipItem) => void - Callback when item is pressed
 * - buttonType?: 'filled' | 'outlined' | 'minimal' - Button style (default: 'outlined')
 * - showIcons?: boolean - Show icons (default: true)
 * - showCounts?: boolean - Show count badges (default: true)
 * - showBadges?: boolean - Show text badges (default: true)
 * - containerStyle?: ViewStyle - Custom container styles
 * - chipStyle?: ViewStyle - Custom chip styles
 * - activeChipStyle?: ViewStyle - Custom active chip styles
 * - textStyle?: TextStyle - Custom text styles
 * - activeTextStyle?: TextStyle - Custom active text styles
 *
 *
 * ChipItem Interface:
 * -------------------
 * {
 *   label: string;              // Display text (required)
 *   icon?: LucideIcon | string; // Lucide icon component or emoji
 *   count?: number;             // Number badge on the right
 *   badge?: string;             // Text badge (e.g., "New", "Hot")
 *   value?: string;             // Internal value (defaults to label)
 * }
 *
 *
 * Button Types:
 * -------------
 * - 'filled': Solid background when active, light gray when inactive
 * - 'outlined': Border with solid background when active, white when inactive
 * - 'minimal': Light green background when active, transparent when inactive
 *
 *
 * Icon Types:
 * -----------
 * 1. Emoji string: icon: '🏠'
 * 2. Lucide icon: icon: Home (import from lucide-react-native)
 *
 *
 * Features:
 * ---------
 * ✅ Horizontal scrolling to both ends
 * ✅ Support for icons (emoji or Lucide)
 * ✅ Support for count badges
 * ✅ Support for text badges
 * ✅ Three button styles
 * ✅ Fully customizable
 * ✅ Controlled or uncontrolled mode
 * ✅ TypeScript support
 */
