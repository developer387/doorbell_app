import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Lock, Unlock, ChevronsRight, Phone } from 'lucide-react-native';
import { SharedLock } from '../../../shared/types/GuestRequest';
import { seamService } from '../../../shared/services/seam.service';

interface GuestLockSheetProps {
  visible: boolean;
  locks: SharedLock[];
  onClose: () => void;
  onEndCall: () => void;
}

interface LockItemState {
  isUnlocking: boolean;
  isUnlocked: boolean;
  autoLockTimeout?: NodeJS.Timeout;
}

export const GuestLockSheet: React.FC<GuestLockSheetProps> = ({
  visible,
  locks,
  onClose,
  onEndCall,
}) => {
  const [lockStates, setLockStates] = useState<Record<string, LockItemState>>({});

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>You can now control these locks.</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        {/* Lock List */}
        <ScrollView style={styles.lockList}>
          {locks.map((lock) => (
            <GuestLockItem
              key={lock.device_id}
              lock={lock}
              state={lockStates[lock.device_id] || { isUnlocking: false, isUnlocked: false }}
              onStateChange={(newState) => {
                setLockStates((prev) => ({
                  ...prev,
                  [lock.device_id]: { ...prev[lock.device_id], ...newState },
                }));
              }}
            />
          ))}
        </ScrollView>

        {/* End Call Button */}
        <TouchableOpacity style={styles.endCallButton} onPress={onEndCall}>
          <Text style={styles.endCallText}>End Call</Text>
          <Phone size={20} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface GuestLockItemProps {
  lock: SharedLock;
  state: LockItemState;
  onStateChange: (state: Partial<LockItemState>) => void;
}

const GuestLockItem: React.FC<GuestLockItemProps> = ({ lock, state, onStateChange }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const maxSwipeDistance = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !state.isUnlocking && !state.isUnlocked,
      onMoveShouldSetPanResponder: () => !state.isUnlocking && !state.isUnlocked,
      onPanResponderGrant: () => {
        slideAnim.setOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const max = maxSwipeDistance.current || 200;
        const clampedX = Math.min(Math.max(gestureState.dx, 0), max);
        slideAnim.setValue(clampedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const max = maxSwipeDistance.current || 200;
        const threshold = max * 0.8;

        if (gestureState.dx >= threshold) {
          handleUnlock();
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

  const handleUnlock = async () => {
    if (state.isUnlocking || state.isUnlocked) return;

    onStateChange({ isUnlocking: true });

    try {
      await seamService.unlockDoor(lock.device_id);

      onStateChange({ isUnlocking: false, isUnlocked: true });

      // Animate to full swipe
      const max = maxSwipeDistance.current || 200;
      Animated.spring(slideAnim, {
        toValue: max,
        useNativeDriver: true,
      }).start();

      // Auto-lock after 60 seconds
      const timeout = setTimeout(async () => {
        try {
          await seamService.lockDoor(lock.device_id);
        } catch (e) {
          console.error('Auto-lock failed:', e);
        }
        onStateChange({ isUnlocked: false });
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }, 60000);

      onStateChange({ autoLockTimeout: timeout });
    } catch (error) {
      console.error('Failed to unlock:', error);
      onStateChange({ isUnlocking: false });
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      Alert.alert('Error', 'Failed to unlock. Please try again.');
    }
  };

  return (
    <View style={styles.lockItem}>
      {/* Lock Header */}
      <View style={styles.lockHeader}>
        <View style={styles.lockIcon}>
          <Lock size={20} color="#fff" />
        </View>
        <View style={styles.lockInfo}>
          <Text style={styles.lockName}>{lock.display_name}</Text>
          <Text style={styles.lockManufacturer}>{lock.manufacturer}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        {state.isUnlocked ? (
          <Unlock size={20} color="#10b981" />
        ) : (
          <Lock size={20} color="#71717a" />
        )}
      </View>

      {/* Swipe to Unlock */}
      <View
        onLayout={(e) => {
          maxSwipeDistance.current = e.nativeEvent.layout.width - 56;
        }}
        style={[
          styles.swipeContainer,
          state.isUnlocked && styles.swipeContainerUnlocked,
        ]}
        {...(state.isUnlocking || state.isUnlocked ? {} : panResponder.panHandlers)}
      >
        <Animated.View
          style={[
            styles.swipeButton,
            state.isUnlocked && styles.swipeButtonUnlocked,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {state.isUnlocking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : state.isUnlocked ? (
            <Unlock size={18} color="#fff" />
          ) : (
            <Lock size={18} color="#fff" />
          )}
        </Animated.View>
        <View style={styles.swipeTextContainer}>
          <Text style={styles.swipeText}>
            {state.isUnlocking
              ? 'Unlocking...'
              : state.isUnlocked
              ? 'Unlocked'
              : 'Swipe for Instant unlock'}
          </Text>
          {!state.isUnlocked && !state.isUnlocking && (
            <ChevronsRight size={18} color="#1a1a1a" />
          )}
        </View>
      </View>

      {/* Temporary Passcode Button */}
      <TouchableOpacity style={styles.passcodeButton}>
        <Text style={styles.passcodeText}>Set temporary unlock passcode</Text>
        <ChevronsRight size={18} color="#1a1a1a" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  lockList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  lockItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lockInfo: {
    flex: 1,
  },
  lockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  lockManufacturer: {
    fontSize: 14,
    color: '#71717a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  swipeContainer: {
    height: 52,
    backgroundColor: '#e5e5e5',
    borderRadius: 26,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
  },
  swipeContainerUnlocked: {
    backgroundColor: '#d1fae5',
  },
  swipeButton: {
    position: 'absolute',
    left: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  swipeButtonUnlocked: {
    backgroundColor: '#10b981',
  },
  swipeTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 56,
    paddingRight: 16,
  },
  swipeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginRight: 8,
  },
  passcodeButton: {
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  passcodeText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  endCallButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  endCallText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
