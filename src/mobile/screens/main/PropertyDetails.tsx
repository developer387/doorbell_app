import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { MainStackParamList } from '@navigation-types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft } from 'lucide-react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { colors } from '@/styles/colors';
import { useAuth } from '@/context/UserContext';
import { Loading, FilterChips, type ChipItem } from '@/components'; // Assuming index exports these
import type { LockState } from '@/components/SmartLockItem';
import { useGetUserProperty } from '@/hooks';
import { usePropertyActions } from '@/hooks/property/usePropertyActions';
import type { Guest } from '@/types/Property';

import { PinSheet } from './components/PropertyDetails/PinSheet';
import { GuestSheet } from './components/PropertyDetails/GuestSheet';
import { GuestSuccessSheet } from './components/PropertyDetails/GuestSuccessSheet';
import { EditSimpleSheet } from './components/PropertyDetails/EditSimpleSheet';
import { DisconnectSuccessSheet } from './components/PropertyDetails/DisconnectSuccessSheet';

import { PropertyDetailsTab } from './components/PropertyDetails/PropertyDetailsTab';
import { SmartLocksTab } from './components/PropertyDetails/SmartLocksTab';
import { GuestsTab } from './components/PropertyDetails/GuestsTab';
import { RequestsTab } from './components/PropertyDetails/RequestsTab';
import { Body, Title } from '@/typography';

export const PropertyDetails = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<any>();
  const { propertyId, initialTab } = route.params;

  const { property, loading, refetch } = useGetUserProperty(user?.uid, propertyId);
  const actions = usePropertyActions(property, refetch);

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [createdGuest, setCreatedGuest] = useState<Guest | null>(null);
  const [selectedLockId, setSelectedLockId] = useState<string | null>(null);
  const [selectedLockName, setSelectedLockName] = useState('');
  const [lockStates, setLockStates] = useState<LockState[]>([]);
  const [isGuestAccessEnabled, setIsGuestAccessEnabled] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string>('none');
  const [requestCount, setRequestCount] = useState(0);


  React.useEffect(() => {
    if (property?.allowGuest !== undefined) setIsGuestAccessEnabled(property.allowGuest);
  }, [property?.allowGuest]);

  React.useEffect(() => {
    if (property?.smartLocks) {
      AsyncStorage.getItem(`lock_states_${propertyId}`)
        .then((stored) => {
          const persisted = stored ? JSON.parse(stored) : [];
          setLockStates(
            property.smartLocks.map(
              (l) =>
                persisted.find((p: any) => p.device_id === l.device_id) || {
                  device_id: l.device_id,
                  display_name: l.display_name,
                  manufacturer: l.manufacturer,
                  isLocked: true,
                }
            )
          );
        })
        .catch(console.error);
    }
  }, [property?.smartLocks, propertyId]);

  React.useEffect(() => {
    if (!propertyId) return;
    const unsub = onSnapshot(collection(db, 'properties', propertyId, 'guestRequests'), (snap) => {
      setRequestCount(snap.size);
    });
    return () => unsub();
  }, [propertyId]);

  const chips: ChipItem[] = [
    { label: 'Property Details', value: 'propertyDetails' },
    { label: 'Smart Locks', value: 'locks', count: property?.smartLocks?.length },
    { label: 'Guests', value: 'guests', count: property?.guests?.length },
    { label: 'Requests', value: 'request', count: requestCount > 0 ? requestCount : undefined },
  ];

  const [activeChip, setActiveChip] = useState(initialTab === 'request' ? 'request' : chips[0].value);

  React.useEffect(() => {
    if (initialTab === 'request') {
      setActiveChip('request');
    }
  }, [initialTab]);

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
        <PropertyDetailsTab
          property={property}
          isGuestAccessEnabled={isGuestAccessEnabled}
          onToggleGuestAccess={async (val) => {
            setIsGuestAccessEnabled(val);
            if (!(await actions.updatePropertyField({ allowGuest: val })))
              setIsGuestAccessEnabled(!val);
          }}
          onEditName={() => setActiveSheet('editName')}
          onOpenPin={() => setActiveSheet('pin')}
          onDisconnect={() =>
            Alert.alert('Disconnect', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Disconnect',
                style: 'destructive',
                onPress: async () => {
                  if (await actions.disconnectProperty()) setActiveSheet('disconnectSuccess');
                },
              },
            ])
          }
        />
      )}

      {activeChip === 'locks' && (
        <SmartLocksTab
          property={property}
          lockStates={lockStates}
          navigation={navigation}
          onLockStateChange={(id, state) => {
            const updated = lockStates.map((l) => (l.device_id === id ? { ...l, ...state } : l));
            setLockStates(updated);
            AsyncStorage.setItem(`lock_states_${propertyId}`, JSON.stringify(updated));
          }}
          onEditLock={(id, name) => {
            setSelectedLockId(id);
            setSelectedLockName(name);
            setActiveSheet('editLock');
          }}
        />
      )}

      {activeChip === 'guests' && (
        <GuestsTab
          property={property}
          onAddGuest={() => setActiveSheet('addGuest')}
          onEditGuest={(g) => {
            setSelectedGuest(g);
            setActiveSheet('editGuest');
          }}
          onRemoveGuest={actions.removeGuest}
          onCopyPin={(pin) => actions.copyToClipboard(pin, 'PIN copied')}
        />
      )}

      {activeChip === 'request' && <RequestsTab propertyId={propertyId} />}

      <PinSheet
        isVisible={activeSheet === 'pin'}
        onClose={() => setActiveSheet('none')}
        currentPin={property?.pinCode}
        onSave={async (pin) => {
          if (await actions.updatePropertyField({ pinCode: pin })) setActiveSheet('none');
        }}
        isLoading={actions.isSaving}
      />
      <EditSimpleSheet
        isVisible={activeSheet === 'editName'}
        onClose={() => setActiveSheet('none')}
        title="Edit Property Name"
        label="Property Name"
        placeholder="Enter property name"
        initialValue={property?.propertyName || ''}
        onSave={async (val) => {
          if (await actions.updatePropertyField({ propertyName: val })) setActiveSheet('none');
        }}
        isLoading={actions.isSaving}
      />
      <EditSimpleSheet
        isVisible={activeSheet === 'editLock'}
        onClose={() => setActiveSheet('none')}
        title="Edit Lock Name"
        label="Lock Name"
        placeholder="Enter lock name"
        initialValue={selectedLockName}
        onSave={async (val) => {
          if (selectedLockId && (await actions.updateLockName(selectedLockId, val)))
            setActiveSheet('none');
        }}
        isLoading={actions.isSaving}
      />
      <GuestSheet
        isVisible={activeSheet === 'addGuest' || activeSheet === 'editGuest'}
        mode={activeSheet === 'addGuest' ? 'add' : 'edit'}
        onClose={() => setActiveSheet('none')}
        isLoading={actions.isSaving}
        initialGuest={selectedGuest}
        generatePin={actions.generatePin}
        onSave={async (data) => {
          if (activeSheet === 'addGuest') {
            const g = await actions.addGuest(data);
            if (g) {
              setCreatedGuest(g);
              setActiveSheet('guestSuccess');
            }
          } else if (selectedGuest) {
            if (await actions.updateGuest(selectedGuest.id, data)) setActiveSheet('none');
          }
        }}
      />
      <GuestSuccessSheet
        isVisible={activeSheet === 'guestSuccess'}
        onClose={() => setActiveSheet('none')}
        guest={createdGuest}
      />
      <DisconnectSuccessSheet
        isVisible={activeSheet === 'disconnectSuccess'}
        onClose={() => {
          setActiveSheet('none');
          navigation.navigate('MainTabs');
        }}
        property={property}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, gap: 8 },
  header: {
    flexDirection: 'column',
    gap: 22,
    paddingTop: 50,
    paddingBottom: 8,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderColor,
  },
});
