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
import { CircleCheckBig, Lock as LockIcon, Unlock as UnlockIcon, ChevronsRight } from 'lucide-react-native';
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
  instantUnlock?: {
    active: boolean;
    expiresAt: number;
  };
}

interface SmartLockItemProps {
  lock: LockState;
  onLockStateChange: (deviceId: string, newState: Partial<LockState>) => void;
  onEdit: () => void;
}

export const SmartLockItem: React.FC<SmartLockItemProps> = ({ lock, onLockStateChange, onEdit }) => {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showTemporaryUnlockControls, setShowTemporaryUnlockControls] = useState(false);
  const [duration, setDuration] = useState<string>('1');
  const [unit, setUnit] = useState<string>('hours');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isCreatingAccessCode, setIsCreatingAccessCode] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Dynamic swipe distance
  const swipeContainerRef = useRef<View>(null);
  const maxSwipeDistance = useRef<number>(0);

  // Temporary Unlock Countdown timer
  useEffect(() => {
    if (lock.temporaryUnlock?.active && lock.temporaryUnlock.expiresAt) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = (lock.temporaryUnlock?.expiresAt ?? 0) - now;

        if (remaining <= 0) {
          setCountdown(null);
          onLockStateChange(lock.device_id, {
            temporaryUnlock: undefined,
            isLocked: true,
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

  // Instant Unlock Auto-Lock Timer
  useEffect(() => {
    if (lock.instantUnlock?.active && lock.instantUnlock.expiresAt) {
      const interval = setInterval(async () => {
        const now = Date.now();
        if (now >= lock.instantUnlock!.expiresAt) {
          clearInterval(interval);
          // Auto-lock
          try {
            await seamService.lockDoor(lock.device_id);
            onLockStateChange(lock.device_id, {
              isLocked: true,
              instantUnlock: undefined,
            });
          } catch (error) {
            console.error('Failed to auto-lock:', error);
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [lock.instantUnlock, lock.device_id, onLockStateChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !lock.temporaryUnlock?.active &&
        !lock.instantUnlock?.active &&
        !isUnlocking &&
        lock.isLocked,
      onMoveShouldSetPanResponder: () =>
        !lock.temporaryUnlock?.active &&
        !lock.instantUnlock?.active &&
        !isUnlocking &&
        lock.isLocked,
      onPanResponderGrant: () => {
        slideAnim.setOffset(0);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const max = maxSwipeDistance.current || 200;
        const clampedX = Math.min(Math.max(gestureState.dx, 0), max);
        slideAnim.setValue(clampedX);
      },
      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const max = maxSwipeDistance.current || 200;
        const threshold = max * 0.8; // Trigger at 80%

        if (gestureState.dx >= threshold) {
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

      const expiresAt = Date.now() + 60 * 1000; // 1 minute from now

      onLockStateChange(lock.device_id, {
        isLocked: false,
        instantUnlock: {
          active: true,
          expiresAt,
        },
      });

      // Animate to full swipe on success
      const max = maxSwipeDistance.current || 200;
      Animated.spring(slideAnim, {
        toValue: max,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }, 600);
      });

      Alert.alert('Success', 'Lock unlocked. It will auto-lock in 1 minute.');
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
    if (!lock.temporaryUnlock?.active && !lock.instantUnlock?.active) {
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
        isLocked: false,
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
  const isInstantUnlockActive = lock.instantUnlock?.active ?? false;
  const isUnlocked = !lock.isLocked || isTemporaryUnlockActive;

  const controlsDisabled =
    isTemporaryUnlockActive || isInstantUnlockActive || isUnlocked || isCreatingAccessCode;
  const swipeDisabled = controlsDisabled || isUnlocking;

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
              <Body>{lock.display_name}</Body>
              <CircleCheckBig size={16} color={colors.primary} strokeWidth={3} />
            </View>
            <SmallText variant="secondary">{lock.manufacturer}</SmallText>
          </View>
        </View>
        <TouchableOpacity onPress={onEdit}>
          <SmallText variant="primary">Edit</SmallText>
        </TouchableOpacity>
      </View>

      <View style={styles.statusSection}>
        <Body weight="bolder">Status</Body>
        <View style={[styles.statusBadge, isUnlocked ? styles.statusOpen : styles.statusClosed]}>
          {isUnlocked ? (
            <>
              <UnlockIcon size={12} color={colors.white} />
              <SmallText style={styles.statusText}>Open</SmallText>
            </>
          ) : (
            <>
              <LockIcon size={12} color={colors.textSecondary} />
              <SmallText variant="secondary">Closed</SmallText>
            </>
          )}
        </View>
      </View>

      {isTemporaryUnlockActive && countdown && (
        <View style={styles.countdownSection}>
          <Body variant="primary" weight="bolder">
            Unlock duration: {countdown}
          </Body>
        </View>
      )}

      {isInstantUnlockActive && (
        <View style={styles.countdownSection}>
          <Body variant="primary" weight="bolder">
            Auto-locking in 1 min
          </Body>
        </View>
      )}

      {showTemporaryUnlockControls && !isTemporaryUnlockActive && (
        <View style={styles.temporaryUnlockInline}>
          <View style={styles.readyToUnlockContainer}>
            <View style={styles.readyToUnlockContent}>
              <Body weight="bolder">Ready to Unlock. Set Duration</Body>
              <ChevronsRight size={20} color={colors.dark} strokeWidth={2} />
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
        ref={swipeContainerRef}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          // Button: 32px, left: 4px, right padding: ~20px
          maxSwipeDistance.current = width - 32 - 4 - 20;
        }}
        style={[
          styles.swipeContainer,
          swipeDisabled && styles.swipeContainerDisabled,
          (isTemporaryUnlockActive || isInstantUnlockActive) && styles.swipeContainerActive,
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
            (isTemporaryUnlockActive || isInstantUnlockActive) && styles.swipeButtonActive,
          ]}
        >
          <View style={styles.swipeIconContainer}>
            {isUnlocked ? (
              <UnlockIcon size={16} color={colors.white} />
            ) : (
              <LockIcon size={16} color={colors.white} />
            )}
          </View>
        </Animated.View>
        <View style={styles.swipeTextContainer}>
          <Body>
            {isUnlocking ? 'Unlocking...' : isUnlocked ? 'Unlocked' : 'Swipe for Instant unlock'}
          </Body>
          {!isUnlocked && <ChevronsRight size={20} color={colors.dark} strokeWidth={2} />}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.temporaryButton, controlsDisabled && styles.temporaryButtonDisabled]}
        onPress={handleToggleTemporaryUnlock}
        disabled={controlsDisabled}
      >
        <Body>Set temporary unlock passcode</Body>
        <ChevronsRight size={20} color={colors.dark} strokeWidth={2} />
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  statusClosed: {
    backgroundColor: 'transparent',
  },
  statusText: {
    color: colors.white,
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
    height: 40,
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
    width: 30,
    height: 30,
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
    paddingHorizontal: 54,
  },
  temporaryButton: {
    height: 40,
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
