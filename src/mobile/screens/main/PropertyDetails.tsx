import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '@navigation-types';
import { StyleSheet, View, TouchableOpacity, Switch, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { useAuth } from '@/context/UserContext';
import { Title, Body, SmallText } from '@/typography';
import { type ChipItem, FilterChips, Loading } from '@/components';
import { SmartLockItem, type LockState } from '@/components/SmartLockItem';
import { useGetUserProperty } from '@/hooks';
import * as Clipboard from 'expo-clipboard';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BottomSheet, Input, Button } from '@/components';
import { ChevronRight, Copy, X } from 'lucide-react-native';
import { Alert } from 'react-native';

type PropertyDetailsRouteProp = RouteProp<MainStackParamList, 'PropertyDetails'>;

const DetailRow = ({ label, value = '', isStatus = false }: { label: string; value?: string; isStatus?: boolean }) => (
  <View style={styles.detailRow}>
    <Body>{label}:</Body>
    {isStatus ? (
      <View style={[styles.statusBadge, styles.activeStatus]}>
        <Body variant="primary" weight="bolder">
          {value}
        </Body>
      </View>
    ) : (
      <Body variant="secondary"> {value}</Body>
    )}
  </View>
);

export const PropertyDetails = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [isGuestAccessEnabled, setIsGuestAccessEnabled] = useState(false);
  const route = useRoute<PropertyDetailsRouteProp>();
  const { propertyId } = route.params;

  const { property, loading } = useGetUserProperty(user?.uid, propertyId);
  const [currentPin, setCurrentPin] = useState<string | undefined>(undefined);

  // Update currentPin when property loads
  React.useEffect(() => {
    if (property?.pinCode) {
      setCurrentPin(property.pinCode);
    }
  }, [property?.pinCode]);

  // Update isGuestAccessEnabled when property loads
  React.useEffect(() => {
    if (property?.allowGuest !== undefined) {
      setIsGuestAccessEnabled(property.allowGuest);
    }
  }, [property?.allowGuest]);

  // PIN Code State
  const [pinCode, setPinCode] = useState('');
  const [isPinSheetVisible, setIsPinSheetVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Disconnect State
  const [isDisconnectSuccessVisible, setIsDisconnectSuccessVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Name State
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Edit Lock State
  const [isEditLockSheetVisible, setIsEditLockSheetVisible] = useState(false);
  const [editLockName, setEditLockName] = useState('');
  const [selectedLockId, setSelectedLockId] = useState<string | null>(null);
  const [isSavingLockName, setIsSavingLockName] = useState(false);

  const handlePinChange = (text: string) => {
    if (/^\d*$/.test(text) && text.length <= 4) {
      setPinCode(text);
      setPinError('');
    }
  };

  const handleSavePin = async () => {
    if (pinCode.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (!property?.id) {
      Alert.alert('Error', 'Property not found');
      return;
    }
    setIsSavingPin(true);
    try {
      const propertyRef = doc(db, 'properties', property.id);
      await updateDoc(propertyRef, { pinCode });
      setCurrentPin(pinCode);
      setPinCode(''); // Clear input
    } catch (error) {
      console.error('Error saving PIN:', error);
      Alert.alert('Error', 'Failed to save PIN');
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleCopyPin = async () => {
    if (currentPin) {
      await Clipboard.setStringAsync(currentPin);
      // Optional: Show toast or feedback
    }
  };

  const openPinSheet = () => {
    setPinCode('');
    setPinError('');
    setIsPinSheetVisible(true);
  };

  const handleDisconnectPress = () => {
    // Custom Alert Implementation matching design
    Alert.alert(
      'Disconnect Door Bell',
      'All the details about this property will be deleted if you continue. Are you sure you want to Continue with this?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: handleDisconnect,
        },
      ]
    );
  };

  const handleDisconnect = async () => {
    if (!property?.id) {
      Alert.alert('Error', 'Property not found');
      return;
    }
    setIsDeleting(true);
    try {
      const propertyRef = doc(db, 'properties', property.id);
      await deleteDoc(propertyRef);
      setIsDisconnectSuccessVisible(true);
    } catch (error) {
      console.error('Error disconnecting property:', error);
      Alert.alert('Error', 'Failed to disconnect property');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDisconnectSuccessDone = () => {
    setIsDisconnectSuccessVisible(false);
    navigation.navigate('MainTabs'); // Navigate back to home
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Property name cannot be empty');
      return;
    }
    if (!property?.id) return;

    setIsSavingName(true);
    try {
      const propertyRef = doc(db, 'properties', property.id);
      await updateDoc(propertyRef, { propertyName: editName.trim() });
      setIsEditSheetVisible(false);
    } catch (error) {
      console.error('Error updating property name:', error);
      Alert.alert('Error', 'Failed to update property name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleEditLock = (lockId: string, currentName: string) => {
    setSelectedLockId(lockId);
    setEditLockName(currentName);
    setIsEditLockSheetVisible(true);
  };

  const handleSaveLockName = async () => {
    if (!editLockName.trim()) {
      Alert.alert('Error', 'Lock name cannot be empty');
      return;
    }
    if (!property?.id || !selectedLockId || !property.smartLocks) return;

    setIsSavingLockName(true);
    try {
      const propertyRef = doc(db, 'properties', property.id);

      const updatedSmartLocks = property.smartLocks.map((lock: any) => {
        if (lock.device_id === selectedLockId) {
          return { ...lock, display_name: editLockName.trim() };
        }
        return lock;
      });

      await updateDoc(propertyRef, { smartLocks: updatedSmartLocks });
      setIsEditLockSheetVisible(false);

      // Also update local lock state if needed to reflect immediately without refresh
      setLockStates((prev) =>
        prev.map((lock) =>
          lock.device_id === selectedLockId
            ? { ...lock, display_name: editLockName.trim() }
            : lock
        )
      );

    } catch (error) {
      console.error('Error updating lock name:', error);
      Alert.alert('Error', 'Failed to update lock name');
    } finally {
      setIsSavingLockName(false);
    }
  };

  // Handle guest access toggle
  const handleGuestAccessToggle = async (value: boolean) => {
    setIsGuestAccessEnabled(value);
    if (!property?.id) return;

    try {
      const propertyRef = doc(db, 'properties', property.id);
      await updateDoc(propertyRef, { allowGuest: value });
    } catch (error) {
      console.error('Error updating guest access:', error);
      Alert.alert('Error', 'Failed to update guest access setting');
      // Revert the toggle on error
      setIsGuestAccessEnabled(!value);
    }
  };

  // Lock states management
  const [lockStates, setLockStates] = useState<LockState[]>([]);

  // Initialize lock states when property loads
  React.useEffect(() => {
    if (property?.smartLocks) {
      // Try to load persisted state first
      loadPersistedLockStates();
    }
  }, [property?.smartLocks]);

  // Load persisted lock states from AsyncStorage
  const loadPersistedLockStates = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(`lock_states_${propertyId}`);
      if (stored && property?.smartLocks) {
        const persistedStates: LockState[] = JSON.parse(stored);

        // Merge with current property locks, reconcile with Seam state
        const mergedStates = property.smartLocks.map((lock) => {
          const persisted = persistedStates.find((ps) => ps.device_id === lock.device_id);

          if (!persisted) {
            return {
              device_id: lock.device_id,
              display_name: lock.display_name,
              manufacturer: lock.manufacturer,
              isLocked: true,
            };
          }

          const now = Date.now();

          // Check if temporary unlock has expired
          if (persisted.temporaryUnlock?.active) {
            if (persisted.temporaryUnlock.expiresAt <= now) {
              // Expired, clear it
              return {
                ...persisted,
                temporaryUnlock: undefined,
                isLocked: true,
              };
            }
          }

          // Check if instant unlock has expired
          if (persisted.instantUnlock?.active) {
            if (persisted.instantUnlock.expiresAt <= now) {
              // Expired, clear it and lock
              return {
                ...persisted,
                isLocked: true,
                instantUnlock: undefined,
              };
            }
          }

          return persisted;
        });

        setLockStates(mergedStates);
      } else if (property?.smartLocks) {
        // No persisted state, initialize fresh
        const initialStates = property.smartLocks.map((lock) => ({
          device_id: lock.device_id,
          display_name: lock.display_name,
          manufacturer: lock.manufacturer,
          isLocked: true,
        }));
        setLockStates(initialStates);
      }
    } catch (error) {
      console.error('Error loading persisted lock states:', error);
      // Fallback to fresh initialization
      if (property?.smartLocks) {
        const initialStates = property.smartLocks.map((lock) => ({
          device_id: lock.device_id,
          display_name: lock.display_name,
          manufacturer: lock.manufacturer,
          isLocked: true,
        }));
        setLockStates(initialStates);
      }
    }
  };

  // Persist lock states to AsyncStorage
  const persistLockStates = async (states: LockState[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(`lock_states_${propertyId}`, JSON.stringify(states));
    } catch (error) {
      console.error('Error persisting lock states:', error);
    }
  };

  // Handle lock state changes
  const handleLockStateChange = (deviceId: string, newState: Partial<LockState>): void => {
    setLockStates((prev) => {
      const updated = prev.map((lock) =>
        lock.device_id === deviceId ? { ...lock, ...newState } : lock
      );
      persistLockStates(updated);
      return updated;
    });
  };


  const chips: ChipItem[] = [
    { label: 'Property Details', value: 'propertyDetails' },
    { label: 'Smart Locks', value: 'locks', count: property?.smartLocks?.length },
    { label: 'Requests', value: 'request', count: 1 },
  ];
  const [activeChip, setActiveChip] = useState(chips[0].value);

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <View>
          <Title>{property?.propertyName}</Title>
          <Body numberOfLines={1}> {property?.address}</Body>
          <FilterChips
            items={chips}
            activeItem={activeChip}
            onItemPress={(item) => setActiveChip(item.value)}
          />
        </View>
      </View>
      {activeChip === 'propertyDetails' && (
        <ScrollView style={styles.contentScroll}>
          <View>
            <View style={styles.sectionHeader}>
              <Body weight="bolder">Property Details</Body>
              <TouchableOpacity onPress={() => {
                setEditName(property?.propertyName || '');
                setIsEditSheetVisible(true);
              }}>
                <Body variant="primary">Edit</Body>
              </TouchableOpacity>
            </View>
            <View style={styles.detailsContent}>
              <DetailRow label="Category" value={property?.category} />
              <DetailRow label="Property Name" value={property?.propertyName} />
              <DetailRow label="Address" value={property?.address} />
              <DetailRow label="Status" value={isGuestAccessEnabled ? "Active" : "In Active"} isStatus={isGuestAccessEnabled} />
            </View>
          </View>
          <View style={styles.toggleSection}>
            <View style={styles.textBlock}>
              <Body weight="bolder">Allow Guest Access</Body>
              <Body variant="secondary">Property is now available to any guest</Body>
            </View>
            <Switch
              onValueChange={handleGuestAccessToggle}
              value={isGuestAccessEnabled}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={isGuestAccessEnabled ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.actionRow} onPress={openPinSheet}>
            <View style={styles.textBlock}>
              <Body weight="bolder">Property PIN Code</Body>
              <Body variant="secondary">
                This will be required for guest to have access to the property.
              </Body>
            </View>
            <ChevronRight size={24} color={colors.dark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionSection} onPress={handleDisconnectPress}>
            <View style={styles.textBlock}>
              <Body variant="error">Disconnect Door Bell</Body>
              <SmallText variant="secondary">
                You will loose all the details about this property.
              </SmallText>
            </View>
            <ChevronRight size={24} color={colors.dark} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeChip === 'locks' && (
        <ScrollView style={styles.contentScroll}>
          {property?.smartLocks && property.smartLocks.length > 0 ? (
            <View style={styles.locksContainer}>
              <View style={styles.smartLocksHeader}>
                <Body weight="bolder">My Smart Locks</Body>
                <TouchableOpacity onPress={() => navigation.navigate('LinkSmartLock', { propertyId })}>
                  <Body variant="primary">+ Add Smart Lock</Body>
                </TouchableOpacity>
              </View>

              {Object.entries(
                property.smartLocks.reduce((acc, lock) => {
                  const manufacturer = lock.manufacturer || 'Unknown';
                  if (!acc[manufacturer]) {
                    acc[manufacturer] = [];
                  }
                  acc[manufacturer].push(lock);
                  return acc;
                }, {} as Record<string, typeof property.smartLocks>)
              ).map(([manufacturer, locks]) => (
                <View key={manufacturer}>
                  {locks.map((lock) => {
                    const lockState = lockStates.find(
                      (ls) => ls.device_id === lock.device_id
                    ) || {
                      device_id: lock.device_id,
                      display_name: lock.display_name,
                      manufacturer: lock.manufacturer,
                      isLocked: true,
                    };

                    return (
                      <SmartLockItem
                        key={lock.device_id}
                        lock={lockState}
                        onLockStateChange={handleLockStateChange}
                        onEdit={() => handleEditLock(lock.device_id, lock.display_name)}
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
                <TouchableOpacity onPress={() => navigation.navigate('LinkSmartLock', { propertyId })}>
                  <Body variant="primary">+ Add Brand</Body>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {activeChip === 'request' && (
        <Body>Requests</Body>
      )}

      {/* PIN Code Bottom Sheet */}
      <BottomSheet
        isVisible={isPinSheetVisible}
        onClose={() => setIsPinSheetVisible(false)}
        minHeight={350}
      >
        <View style={styles.sheetHeader}>
          <Body weight="bolder">Property PIN Code</Body>
          <TouchableOpacity onPress={() => setIsPinSheetVisible(false)}>
            <X size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {currentPin && !pinCode ? (
          <View style={styles.pinDisplayContainer}>
            <Title style={styles.pinText}>{currentPin}</Title>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyPin}>
              <Body variant="primary" style={{ textDecorationLine: 'underline' }}>Copy Code</Body>
              <Copy size={20} color={colors.primary} />
            </TouchableOpacity>

            <Body variant="secondary" style={styles.pinNote}>
              Don't share this with anyone except a trusted Guest
            </Body>

            <Button
              title="Change Code"
              onPress={() => setPinCode(currentPin)}
              style={styles.saveButton}
            />
          </View>
        ) : (
          <View style={styles.pinInputContainer}>
            <Input
              value={pinCode}
              onChangeText={handlePinChange}
              placeholder="Enter 4-digit PIN"
              keyboardType="numeric"
              maxLength={4}
              error={pinError}
              label="Enter PIN"
            />
            <Button
              title="Save"
              onPress={handleSavePin}
              disabled={pinCode.length !== 4}
              isLoading={isSavingPin}
              style={styles.saveButton}
            />
          </View>
        )}
      </BottomSheet>

      {/* Disconnect Success Bottom Sheet */}
      <BottomSheet
        isVisible={isDisconnectSuccessVisible}
        onClose={() => { }}
        enablePanGesture={false}
        closeOnBackdropPress={false}
        minHeight={400}
      >
        <View style={styles.successSheetContainer}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={handleDisconnectSuccessDone}>
              <X size={24} color={colors.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.successIconContainer}>
            <Image
              source={require('../../../../assets/disconnect.png')}
              resizeMode="contain"
            />
          </View>

          <Title style={styles.successTitle}>Door Bell disconnected successfully</Title>

          <View style={styles.disconnectedPropertyCard}>
            <View>
              <Body weight="bolder">{property?.propertyName}</Body>
              <SmallText variant="secondary">{property?.address}</SmallText>
            </View>
            <View style={styles.houseIconPlaceholder} />
          </View>

          <SmallText variant="secondary" style={styles.successNote}>
            All details about this property has been deleted
          </SmallText>

          <Button
            title="Done"
            onPress={handleDisconnectSuccessDone}
            style={styles.doneButton}
          />
        </View>
      </BottomSheet>

      {/* Edit Property Name Bottom Sheet */}
      <BottomSheet
        isVisible={isEditSheetVisible}
        onClose={() => setIsEditSheetVisible(false)}
        minHeight={300}
      >
        <View style={styles.sheetHeader}>
          <Body weight="bolder">Edit Property Name</Body>
          <TouchableOpacity onPress={() => setIsEditSheetVisible(false)}>
            <X size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.pinInputContainer}>
          <Input
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter property name"
            label="Property Name"
          />
          <Button
            title="Save Changes"
            onPress={handleSaveName}
            isLoading={isSavingName}
            disabled={!editName.trim()}
            style={styles.saveButton}
          />
        </View>
      </BottomSheet>

      {/* Edit Lock Name Bottom Sheet */}
      <BottomSheet
        isVisible={isEditLockSheetVisible}
        onClose={() => setIsEditLockSheetVisible(false)}
        minHeight={300}
      >
        <View style={styles.sheetHeader}>
          <Body weight="bolder">Edit Lock Name</Body>
          <TouchableOpacity onPress={() => setIsEditLockSheetVisible(false)}>
            <X size={24} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.pinInputContainer}>
          <Input
            value={editLockName}
            onChangeText={setEditLockName}
            placeholder="Enter lock name"
            label="Lock Name"
          />
          <Button
            title="Save Changes"
            onPress={handleSaveLockName}
            isLoading={isSavingLockName}
            disabled={!editLockName.trim()}
            style={styles.saveButton}
          />
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    gap: 8,
  },

  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 22,
    paddingTop: 50,
    paddingBottom: 8,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderColor,
  },

  contentScroll: {
    flex: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailsContent: {
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
  },
  activeStatus: {
    backgroundColor: colors.activeTagBg,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },

  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 50,
  },
  textBlock: {
    flex: 1,
    paddingRight: 10,
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
  lockBrandCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  lockBrandHeader: {
    marginBottom: 12,
  },
  lockItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  lockItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lockItemIcon: {
    width: 40,
    height: 40,
  },
  lockItemInfo: {
    flex: 1,
  },
  lockItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyLocksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pinDisplayContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  pinText: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinNote: {
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  pinInputContainer: {
    gap: 24,
    paddingVertical: 20,
  },
  saveButton: {
    marginTop: 16,
  },
  successSheetContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  closeButtonContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  disconnectedPropertyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 24,
  },
  houseIconPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  successNote: {
    marginBottom: 24,
    textAlign: 'center',
  },
  doneButton: {
    width: '100%',
  }
})
