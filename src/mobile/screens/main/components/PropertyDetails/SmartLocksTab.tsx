import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Body } from '@/typography';
import { colors } from '@/styles/colors';
import { SmartLockItem, type LockState } from '@/components/SmartLockItem';
import { type Property } from '@/types/Property';

interface Props {
    property: Property | null;
    lockStates: LockState[];
    onLockStateChange: (deviceId: string, newState: Partial<LockState>) => void;
    onEditLock: (id: string, name: string) => void;
    navigation: any; // Type strictly if possible, but any works for extraction
}

export const SmartLocksTab = ({
    property,
    lockStates,
    onLockStateChange,
    onEditLock,
    navigation
}: Props) => {
    return (
        <ScrollView style={styles.contentScroll}>
            {property?.smartLocks && property.smartLocks.length > 0 ? (
                <View style={styles.locksContainer}>
                    <View style={styles.smartLocksHeader}>
                        <Body weight="bolder">My Smart Locks</Body>
                        <TouchableOpacity onPress={() => navigation.navigate('LinkSmartLock', { propertyId: property.id })}>
                            <Body variant="primary">+ Add Smart Lock</Body>
                        </TouchableOpacity>
                    </View>

                    {Object.entries(
                        property.smartLocks.reduce((acc, lock) => {
                            const m = lock.manufacturer || 'Unknown';
                            if (!acc[m]) acc[m] = [];
                            acc[m].push(lock);
                            return acc;
                        }, {} as any)
                    ).map(([manufacturer, locks]: [string, any]) => (
                        <View key={manufacturer}>
                            {locks.map((lock: any) => {
                                const lockState = lockStates.find(ls => ls.device_id === lock.device_id) || {
                                    device_id: lock.device_id,
                                    display_name: lock.display_name,
                                    manufacturer: lock.manufacturer,
                                    isLocked: true,
                                };
                                return (
                                    <SmartLockItem
                                        key={lock.device_id}
                                        lock={lockState}
                                        onLockStateChange={onLockStateChange}
                                        onEdit={() => onEditLock(lock.device_id, lock.display_name)}
                                    />
                                );
                            })}
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyLocksState}>
                    <View style={styles.emptyLocksBrandSection}>
                        <Body weight="bolder">Smart Lock Brand</Body>
                        <TouchableOpacity onPress={() => navigation.navigate('LinkSmartLock', { propertyId: property?.id })}>
                            <Body variant="primary">+ Add Brand</Body>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    contentScroll: {
        flex: 1,
    },
    locksContainer: {
        paddingVertical: 8,
    },
    smartLocksHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 8,
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
