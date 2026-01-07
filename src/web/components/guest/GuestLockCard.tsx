import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
} from 'react-native';
import { Lock, Unlock, ChevronRight } from 'lucide-react-native';
import { type SmartLock } from '@/types/Property';

interface GuestLockCardProps {
    lock: SmartLock;
    onUnlock: () => void;
    isUnlocking?: boolean;
}

export function GuestLockCard({ lock, onUnlock, isUnlocking = false }: GuestLockCardProps) {
    const [dragX] = useState(new Animated.Value(0));
    const [isComplete, setIsComplete] = useState(false);
    const BUTTON_WIDTH = 300;

    const handlePress = () => {
        if (isComplete || isUnlocking) return;

        Animated.timing(dragX, {
            toValue: BUTTON_WIDTH - 50,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            setIsComplete(true);
            onUnlock();
            setTimeout(() => {
                setIsComplete(false);
                dragX.setValue(0);
            }, 2000);
        });
    };

    const displayName = lock.display_name || 'Smart Lock';
    const manufacturer = lock.manufacturer || 'Igloohome';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Lock size={20} color="#fff" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.lockName}>{displayName}</Text>
                    <Text style={styles.manufacturer}>{manufacturer}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status</Text>
                <Lock size={16} color="#aaa" />
            </View>

            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                style={[
                    styles.swipeButton,
                    isComplete && styles.swipeButtonComplete,
                ]}
                disabled={isUnlocking}
            >
                <View style={styles.swipeTextContainer}>
                    <Text
                        style={[
                            styles.swipeText,
                            isComplete && styles.swipeTextComplete,
                        ]}
                    >
                        {isComplete
                            ? 'Unlocked!'
                            : isUnlocking
                                ? 'Unlocking...'
                                : 'Tap for Instant unlock  »'}
                    </Text>
                </View>

                <Animated.View
                    style={[
                        styles.swipeThumb,
                        isComplete && styles.swipeThumbComplete,
                        { transform: [{ translateX: dragX }] },
                    ]}
                >
                    {isComplete ? (
                        <Unlock size={24} color="#4ade80" />
                    ) : (
                        <Lock size={24} color="#fff" />
                    )}
                </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.passcodeButton}>
                <Text style={styles.passcodeButtonText}>Set temporary unlock passcode</Text>
                <ChevronRight size={16} color="#000" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        backgroundColor: '#333',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    lockName: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    manufacturer: {
        color: '#888',
        fontSize: 13,
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 8,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusLabel: {
        color: '#888',
        fontSize: 14,
    },
    swipeButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#333',
        borderRadius: 28,
        justifyContent: 'center',
        overflow: 'hidden',
        marginTop: 15,
        marginBottom: 10,
    },
    swipeButtonComplete: {
        backgroundColor: '#4ade80',
    },
    swipeTextContainer: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
    },
    swipeText: {
        color: '#aaa',
        fontWeight: '600',
        fontSize: 15,
    },
    swipeTextComplete: {
        color: '#000',
    },
    swipeThumb: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#4ade80',
        marginLeft: 3,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    swipeThumbComplete: {
        backgroundColor: '#fff',
    },
    passcodeButton: {
        backgroundColor: '#fff',
        borderRadius: 28,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    passcodeButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 15,
    },
});
