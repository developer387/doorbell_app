import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { MediumText, RegularText } from '../typography';
import { colors } from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

/**
 * Example usage of the BottomSheet component
 * This file demonstrates various use cases and features
 */

export const BottomSheetExamples = () => {
    const [isBasicSheetVisible, setIsBasicSheetVisible] = useState(false);
    const [isLongContentSheetVisible, setIsLongContentSheetVisible] = useState(false);
    const [isBrandSheetVisible, setIsBrandSheetVisible] = useState(false);

    return (
        <View style={styles.container}>
            <Button
                title="Open Basic Bottom Sheet"
                onPress={() => setIsBasicSheetVisible(true)}
                style={styles.button}
            />

            <Button
                title="Open Long Content Sheet"
                onPress={() => setIsLongContentSheetVisible(true)}
                style={styles.button}
            />

            <Button
                title="Open Brand Selection Sheet"
                onPress={() => setIsBrandSheetVisible(true)}
                style={styles.button}
            />

            {/* Basic Bottom Sheet Example */}
            <BottomSheet
                isVisible={isBasicSheetVisible}
                onClose={() => setIsBasicSheetVisible(false)}
            >
                <View style={styles.sheetContent}>
                    <MediumText style={styles.sheetTitle}>Basic Bottom Sheet</MediumText>
                    <RegularText style={styles.sheetText}>
                        This is a simple bottom sheet with minimal content.
                    </RegularText>
                    <Button
                        title="Close"
                        onPress={() => setIsBasicSheetVisible(false)}
                        style={styles.sheetButton}
                    />
                </View>
            </BottomSheet>

            {/* Long Content Bottom Sheet Example */}
            <BottomSheet
                isVisible={isLongContentSheetVisible}
                onClose={() => setIsLongContentSheetVisible(false)}
            >
                <View style={styles.sheetContent}>
                    <MediumText style={styles.sheetTitle}>Scrollable Content</MediumText>
                    <RegularText style={styles.sheetText}>
                        This bottom sheet contains a lot of content and will be scrollable.
                    </RegularText>
                    {Array.from({ length: 20 }).map((_, index) => (
                        <View key={index} style={styles.listItem}>
                            <RegularText>Item {index + 1}</RegularText>
                        </View>
                    ))}
                    <Button
                        title="Close"
                        onPress={() => setIsLongContentSheetVisible(false)}
                        style={styles.sheetButton}
                    />
                </View>
            </BottomSheet>

            {/* Brand Selection Bottom Sheet (Based on uploaded image) */}
            <BottomSheet
                isVisible={isBrandSheetVisible}
                onClose={() => setIsBrandSheetVisible(false)}
            >
                <View style={styles.sheetContent}>
                    <View style={styles.header}>
                        <MediumText style={styles.brandTitle}>Select a brand</MediumText>
                        <TouchableOpacity onPress={() => setIsBrandSheetVisible(false)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.gray400} style={styles.searchIcon} />
                        <RegularText style={styles.searchPlaceholder}>Search Smart lock brand</RegularText>
                    </View>

                    <View style={styles.poweredBy}>
                        <RegularText style={styles.poweredByText}>Powered by</RegularText>
                        <MediumText style={styles.poweredByBrand}>seam</MediumText>
                    </View>

                    {/* Brand List */}
                    <View style={styles.brandList}>
                        {brands.map((brand) => (
                            <TouchableOpacity
                                key={brand.id}
                                style={styles.brandItem}
                                onPress={() => {
                                    console.log('Selected:', brand.name);
                                    setIsBrandSheetVisible(false);
                                }}
                            >
                                <View style={styles.brandLeft}>
                                    {brand.icon && (
                                        <View style={styles.brandIconContainer}>
                                            <RegularText>{brand.icon}</RegularText>
                                        </View>
                                    )}
                                    <RegularText style={styles.brandName}>{brand.name}</RegularText>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </BottomSheet>
        </View>
    );
};

// Sample brand data
const brands = [
    { id: '1', name: 'Igloohome', icon: '🏠' },
    { id: '2', name: 'TTLock', icon: '🔷' },
    { id: '3', name: 'Noiseaware', icon: 'ℹ️' },
    { id: '4', name: 'My2N', icon: '2N' },
    { id: '5', name: 'Minut', icon: 'MINUT' },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    button: {
        marginBottom: 16,
    },
    sheetContent: {
        paddingVertical: 8,
    },
    sheetTitle: {
        fontSize: 20,
        marginBottom: 16,
        color: colors.text,
    },
    sheetText: {
        fontSize: 14,
        color: colors.gray600,
        marginBottom: 16,
        lineHeight: 20,
    },
    sheetButton: {
        marginTop: 16,
    },
    listItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    brandTitle: {
        fontSize: 20,
        color: colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchPlaceholder: {
        color: colors.gray400,
        fontSize: 14,
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
        color: colors.gray500,
    },
    poweredByBrand: {
        fontSize: 12,
        color: colors.text,
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
        borderColor: colors.gray200,
    },
    brandLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brandIconContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        fontSize: 16,
        color: colors.text,
    },
});
