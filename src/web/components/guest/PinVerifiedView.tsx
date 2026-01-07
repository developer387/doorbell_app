import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CircleCheckBig } from 'lucide-react-native';

interface PinVerifiedViewProps {
    guestName?: string;
    onViewLocks: () => void;
    onCancel: () => void;
}

export function PinVerifiedView({
    guestName,
    onViewLocks,
    onCancel,
}: PinVerifiedViewProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
                <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.successIconContainer}>
                <CircleCheckBig size={80} color="#fff" />
            </View>

            <Text style={styles.successTitle}>Access PIN code confirmed</Text>

            {guestName ? (
                <Text style={styles.welcomeText}>Welcome, {guestName}</Text>
            ) : null}

            <Text style={styles.successSubtitle}>
                Click button below to view property locks
            </Text>

            <TouchableOpacity style={styles.viewLocksButton} onPress={onViewLocks}>
                <Text style={styles.viewLocksButtonText}>View Locks</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#222',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 400,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        top: 20,
        zIndex: 1,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 20,
    },
    successIconContainer: {
        marginVertical: 40,
    },
    successTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    welcomeText: {
        color: '#4ade80',
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    successSubtitle: {
        color: '#aaa',
        marginBottom: 30,
        textAlign: 'center',
        fontSize: 14,
    },
    viewLocksButton: {
        backgroundColor: '#4ade80',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    viewLocksButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
