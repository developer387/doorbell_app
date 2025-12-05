import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    Animated,
    PanResponder,
    Alert,
    TextInput,
    ActivityIndicator,
    type GestureResponderEvent,
    type PanResponderGestureState,
} from 'react-native';
import { Check, Lock as LockIcon, ChevronRight } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Body, SmallText } from '@/typography';
import { Dropdown } from '@/components/Dropdown';
import { seamService } from '@/services/seam.service';

export interface LockState {
    device_id: string;
    display_name: string;
    manufacturer: string;
    isLocked: boolean;
    temporaryUnlock?: {
        active: boolean;
        expiresAt: number;
        code: string;
        access_code_id?: string;
    };
}

interface SmartLockItemProps {
    lock: LockState;
    onLockStateChange: (deviceId: string, newState: Partial<LockState>) => void;
}

export const SmartLockItem: React.FC<SmartLockItemProps> = ({
    lock,
    onLockStateChange,
}) => {
    const [countdown, setCountdown] = useState<string | null>(null);
    const [showTemporaryUnlockControls, setShowTemporaryUnlockControls] = useState(false);
    const [duration, setDuration] = useState<string>('1');
    const [unit, setUnit] = useState<string>('hours');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isCreatingAccessCode, setIsCreatingAccessCode] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = 200;

    // Countdown timer
    useEffect(() => {
        if (lock.temporaryUnlock?.active && lock.temporaryUnlock.expiresAt) {
            const interval = setInterval(() => {
                const now = Date.now();
                const remaining = lock.temporaryUnlock!.expiresAt - now;

                if (remaining <= 0) {
                    setCountdown(null);
                    onLockStateChange(lock.device_id, {
                        temporaryUnlock: undefined,
                    });
                    clearInterval(interval);
                } else {
                    const hours = Math.floor(remaining / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    setCountdown(formattedTime);
                }
            }, 1000);

            return () => {
                clearInterval(interval);
            };
        }

        setCountdown(null);
        return undefined;
    }, [lock.temporaryUnlock, lock.device_id, onLockStateChange]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !lock.temporaryUnlock?.active && !isUnlocking,
            onMoveShouldSetPanResponder: () => !lock.temporaryUnlock?.active && !isUnlocking,
            onPanResponderGrant: () => {
                slideAnim.setOffset(0);
            },
            onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                if (gestureState.dx >= 0 && gestureState.dx <= SWIPE_THRESHOLD) {
                    slideAnim.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                if (gestureState.dx >= SWIPE_THRESHOLD) {
                    handleInstantUnlock();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 7,
                    }).start();
                }
            },
        })
    ).current;

    const handleInstantUnlock = async (): Promise<void> => {
        if (isUnlocking) return;

        setIsUnlocking(true);
        try {
            await seamService.unlockDoor(lock.device_id);

            onLockStateChange(lock.device_id, { isLocked: false });

            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();

            Alert.alert('Success', 'Lock unlocked successfully!');
        } catch (error) {
            console.error('Failed to unlock:', error);
            Alert.alert('Error', 'Failed to unlock. Please try again.');
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleToggleTemporaryUnlock = (): void => {
        if (!lock.temporaryUnlock?.active) {
            setShowTemporaryUnlockControls(!showTemporaryUnlockControls);
        }
    };

    const handleConfirmTemporaryUnlock = async (): Promise<void> => {
        if (isCreatingAccessCode || !duration || Number(duration) <= 0) return;

        setIsCreatingAccessCode(true);
        try {
            const result = await seamService.createAccessCode(
                lock.device_id,
                Number(duration),
                unit as 'minutes' | 'hours'
            );

            onLockStateChange(lock.device_id, {
                temporaryUnlock: {
                    active: true,
                    expiresAt: result.expiresAt,
                    code: result.code,
                },
            });

            setShowTemporaryUnlockControls(false);

            Alert.alert(
                'Temporary Unlock Code',
                `Your unlock code is: ${result.code}\n\nThis code will expire in ${duration} ${unit}.`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Failed to create access code:', error);
            Alert.alert('Error', 'Failed to create temporary unlock code. Please try again.');
        } finally {
            setIsCreatingAccessCode(false);
        }
    };

    const handleCancelTemporaryUnlock = (): void => {
        if (!isCreatingAccessCode) {
            setShowTemporaryUnlockControls(false);
            setDuration('1');
            setUnit('hours');
        }
    };

    const isTemporaryUnlockActive = lock.temporaryUnlock?.active ?? false;
    const swipeDisabled = isTemporaryUnlockActive || isUnlocking;
    const controlsDisabled = isTemporaryUnlockActive || isCreatingAccessCode;

    return (
        <View style={styles.lockCard}>
            <View style={styles.lockHeader}>
                <View style={styles.lockHeaderLeft}>
                    <Image
                        source={require('../../assets/remote.png')}
                        style={styles.lockIcon}
                        resizeMode="contain"
                    />
                    <View style={styles.lockInfo}>
                        <View style={styles.lockNameRow}>
                            <Body weight="bolder">{lock.display_name}</Body>
                            <Check size={16} color={colors.primary} strokeWidth={3} />
                        </View>
                        <SmallText variant="secondary">{lock.manufacturer}</SmallText>
                    </View>
                </View>
                <TouchableOpacity>
                    <Body variant="primary">Edit</Body>
                </TouchableOpacity>
            </View>

            <View style={styles.statusSection}>
                <Body weight="bolder">Status</Body>
                <LockIcon size={20} color={colors.textSecondary} />
            </View>

            {isTemporaryUnlockActive && countdown && (
                <View style={styles.countdownSection}>
                    <Body variant="primary" weight="bolder">
                        Unlock duration: {countdown}
                    </Body>
                </View>
            )}

            {showTemporaryUnlockControls && !isTemporaryUnlockActive && (
                <View style={styles.temporaryUnlockInline}>
                    <View style={styles.readyToUnlockContainer}>
                        <View style={styles.readyToUnlockContent}>
                            <Body weight="bolder">Ready to Unlock. Set Duration</Body>
                            <ChevronRight size={20} color={colors.dark} strokeWidth={2} />
                        </View>
                        <View style={styles.lockIconCircle}>
                            <LockIcon size={20} color={colors.white} />
                        </View>
                    </View>

                    <Body weight="bolder" style={styles.durationLabel}>
                        How long do you want to unlock it for?
                    </Body>

                    <View style={styles.durationInputRow}>
                        <TextInput
                            style={styles.durationInput}
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="numeric"
                            placeholder="1"
                            editable={!isCreatingAccessCode}
                        />
                        <View style={styles.unitDropdownWrapper}>
                            <Dropdown
                                options={['minutes', 'hours']}
                                value={unit}
                                onValueChange={setUnit}
                                placeholder="hours"
                            />
                        </View>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancelTemporaryUnlock}
                            disabled={isCreatingAccessCode}
                        >
                            <Body>{isCreatingAccessCode ? '...' : 'Cancel'}</Body>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={handleConfirmTemporaryUnlock}
                            disabled={isCreatingAccessCode}
                        >
                            {isCreatingAccessCode ? (
                                <ActivityIndicator color={colors.white} size="small" />
                            ) : (
                                <Body style={styles.confirmButtonText}>Confirm</Body>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View
                style={[
                    styles.swipeContainer,
                    swipeDisabled && styles.swipeContainerDisabled,
                    isTemporaryUnlockActive && styles.swipeContainerActive,
                ]}
                {...(swipeDisabled ? {} : panResponder.panHandlers)}
            >
                <Animated.View
                    style={[
                        styles.swipeButton,
                        {
                            transform: [{ translateX: slideAnim }],
                        },
                        swipeDisabled && styles.swipeButtonDisabled,
                        isTemporaryUnlockActive && styles.swipeButtonActive,
                    ]}
                >
                    <View style={styles.swipeIconContainer}>
                        <LockIcon size={20} color={colors.white} />
                    </View>
                </Animated.View>
                <View style={styles.swipeTextContainer}>
                    <Body weight="bolder">
                        {isUnlocking
                            ? 'Unlocking...'
                            : 'Swipe for Instant unlock'}
                    </Body>
                    <ChevronRight size={20} color={colors.dark} strokeWidth={2} />
                </View>
            </View>

            <TouchableOpacity
                style={[
                    styles.temporaryButton,
                    controlsDisabled && styles.temporaryButtonDisabled,
                ]}
                onPress={handleToggleTemporaryUnlock}
                disabled={controlsDisabled}
            >
                <Body weight="bolder">Set temporary unlock passcode</Body>
                <ChevronRight size={20} color={colors.dark} strokeWidth={2} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    lockCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        marginBottom: 16,
    },
    lockHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    lockHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    lockIcon: {
        width: 40,
        height: 40,
    },
    lockInfo: {
        flex: 1,
    },
    lockNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    countdownSection: {
        marginBottom: 12,
    },
    temporaryUnlockInline: {
        marginBottom: 12,
    },
    readyToUnlockContainer: {
        height: 56,
        backgroundColor: '#D1F4E8',
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
        paddingRight: 4,
        marginBottom: 16,
    },
    readyToUnlockContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    lockIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    durationLabel: {
        marginBottom: 12,
    },
    durationInputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    durationInput: {
        flex: 1,
        height: 52,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.dark,
    },
    unitDropdownWrapper: {
        flex: 1.2,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    confirmButton: {
        backgroundColor: colors.primary,
    },
    confirmButtonText: {
        color: colors.white,
    },
    swipeContainer: {
        height: 56,
        backgroundColor: '#FFE5E5',
        borderRadius: 28,
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 12,
        overflow: 'hidden',
    },
    swipeContainerDisabled: {
        backgroundColor: '#F5F5F5',
    },
    swipeContainerActive: {
        backgroundColor: '#FFE5E5',
    },
    swipeButton: {
        position: 'absolute',
        left: 4,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    swipeButtonDisabled: {
        backgroundColor: colors.textSecondary,
    },
    swipeButtonActive: {
        backgroundColor: '#EF4444',
    },
    swipeIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    swipeTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 60,
    },
    temporaryButton: {
        height: 56,
        backgroundColor: colors.white,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    temporaryButtonDisabled: {
        opacity: 0.5,
    },
});
