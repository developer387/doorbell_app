import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { type SmartLock } from '@/types/Property';
import { GuestLockCard } from './GuestLockCard';

interface LocksListViewProps {
    propertyName: string;
    propertyAddress: string;
    guestName?: string;
    locks: SmartLock[];
    onUnlock: (deviceId: string) => void;
    onExit: () => void;
}

export function LocksListView({
    propertyName,
    propertyAddress,
    guestName,
    locks,
    onUnlock,
    onExit,
}: LocksListViewProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.headerSection}>
                    <Text style={styles.propertyName}>{propertyName} 🏠</Text>
                    <Text style={styles.propertyAddress}>{propertyAddress}</Text>
                    {guestName ? (
                        <Text style={styles.welcomeText}>Welcome, {guestName}</Text>
                    ) : null}
                </View>

                <View style={styles.locksContainer}>
                    {locks.map((lock) => (
                        <GuestLockCard
                            key={lock.device_id}
                            lock={lock}
                            onUnlock={() => onUnlock(lock.device_id)}
                        />
                    ))}
                </View>

                <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                    <Text style={styles.exitButtonText}>Exit Property</Text>
                    <LogOut size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    scrollView: {
        width: '100%',
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    headerSection: {
        marginTop: 20,
        marginBottom: 30,
    },
    propertyName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    propertyAddress: {
        fontSize: 15,
        color: '#888',
    },
    welcomeText: {
        fontSize: 14,
        color: '#4ade80',
        marginTop: 4,
    },
    locksContainer: {
        width: '100%',
    },
    exitButton: {
        backgroundColor: '#ef4444',
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 8,
    },
    exitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    bottomSpacer: {
        height: 40,
    },
});
