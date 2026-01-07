import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface GuestStateMessageProps {
    type: 'loading' | 'error' | 'no_locks' | 'expired' | 'not_active' | 'system_error';
    message?: string;
    guestName?: string;
}

export function GuestStateMessage({ type, message, guestName }: GuestStateMessageProps) {
    const renderContent = () => {
        switch (type) {
            case 'loading':
                return (
                    <>
                        <ActivityIndicator size="large" color="#4ade80" />
                        <Text style={styles.title}>Loading...</Text>
                        <Text style={styles.subtitle}>Please wait while we verify your access</Text>
                    </>
                );

            case 'error':
                return (
                    <>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.title}>Access Denied</Text>
                        <Text style={styles.subtitle}>{message || 'Invalid PIN code'}</Text>
                    </>
                );

            case 'no_locks':
                return (
                    <>
                        <Text style={styles.infoIcon}>🔒</Text>
                        <Text style={styles.title}>No Locks Available</Text>
                        <Text style={styles.subtitle}>
                            {guestName
                                ? `${guestName}, you don't have any locks assigned to your access.`
                                : 'There are no locks available for your access.'}
                        </Text>
                        <Text style={styles.helpText}>
                            Please contact the property owner to grant access.
                        </Text>
                    </>
                );

            case 'expired':
                return (
                    <>
                        <Text style={styles.warningIcon}>⏰</Text>
                        <Text style={styles.title}>Access Expired</Text>
                        <Text style={styles.subtitle}>
                            {guestName
                                ? `${guestName}, your access window has ended.`
                                : 'Your access window has ended.'}
                        </Text>
                        <Text style={styles.helpText}>
                            Please contact the property owner for renewed access.
                        </Text>
                    </>
                );

            case 'not_active':
                return (
                    <>
                        <Text style={styles.warningIcon}>🕐</Text>
                        <Text style={styles.title}>Access Not Yet Active</Text>
                        <Text style={styles.subtitle}>
                            {guestName
                                ? `${guestName}, your access window hasn't started yet.`
                                : "Your access window hasn't started yet."}
                        </Text>
                        <Text style={styles.helpText}>
                            Please come back when your scheduled access begins.
                        </Text>
                    </>
                );

            case 'system_error':
                return (
                    <>
                        <Text style={styles.errorIcon}>❌</Text>
                        <Text style={styles.title}>System Error</Text>
                        <Text style={styles.subtitle}>
                            {message || 'An unexpected error occurred'}
                        </Text>
                        <Text style={styles.helpText}>
                            Please try again or contact support if the issue persists.
                        </Text>
                    </>
                );

            default:
                return null;
        }
    };

    return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginTop: 24,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
    },
    helpText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 8,
    },
    errorIcon: {
        fontSize: 64,
    },
    warningIcon: {
        fontSize: 64,
    },
    infoIcon: {
        fontSize: 64,
    },
});
