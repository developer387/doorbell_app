import { useState } from 'react';
import { Alert } from 'react-native';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getFirestore } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Guest, Property, SmartLock } from '@/types/Property';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';

export const usePropertyActions = (property: Property | null, refetch: () => Promise<void>) => {
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

    // Loading states
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

    const updatePropertyField = async (field: Partial<Property>) => {
        if (!property?.id) return false;
        setIsSaving(true);
        try {
            const propertyRef = doc(db, 'properties', property.id);
            await updateDoc(propertyRef, field);
            await refetch();
            return true;
        } catch (error) {
            console.error('Error updating property:', error);
            Alert.alert('Error', 'Failed to update property');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const addGuest = async (guestData: Omit<Guest, 'id' | 'createdAt' | 'accessPin'>) => {
        if (!property?.id) return null;
        setIsSaving(true);
        try {
            const pin = generatePin();
            const newGuest: Guest = {
                id: Math.random().toString(36).substr(2, 9),
                ...guestData,
                accessPin: pin,
                createdAt: new Date().toISOString(),
            };

            const propertyRef = doc(db, 'properties', property.id);
            await updateDoc(propertyRef, {
                guests: arrayUnion(newGuest)
            });
            await refetch();
            return newGuest;
        } catch (error) {
            console.error('Error adding guest:', error);
            Alert.alert('Error', 'Failed to add guest');
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const updateGuest = async (guestId: string, updates: Partial<Guest>) => {
        if (!property?.id || !property.guests) return false;
        setIsSaving(true);
        try {
            const updatedGuests = property.guests.map((g) => {
                if (g.id === guestId) {
                    return { ...g, ...updates };
                }
                return g;
            });

            const propertyRef = doc(db, 'properties', property.id);
            await updateDoc(propertyRef, { guests: updatedGuests });
            await refetch();
            return true;
        } catch (error) {
            console.error('Error updating guest:', error);
            Alert.alert('Error', 'Failed to update guest');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const removeGuest = async (guest: Guest) => {
        if (!property?.id) return;
        try {
            const propertyRef = doc(db, 'properties', property.id);
            await updateDoc(propertyRef, {
                guests: arrayRemove(guest)
            });
            await refetch();
        } catch (error) {
            console.error('Error removing guest:', error);
            Alert.alert('Error', 'Failed to remove guest');
        }
    };

    const updateLockName = async (lockId: string, newName: string) => {
        if (!property?.id || !property.smartLocks) return false;
        setIsSaving(true);
        try {
            const propertyRef = doc(db, 'properties', property.id);
            const updatedSmartLocks = property.smartLocks.map((lock) => {
                if (lock.device_id === lockId) {
                    return { ...lock, display_name: newName.trim() };
                }
                return lock;
            });
            await updateDoc(propertyRef, { smartLocks: updatedSmartLocks });
            // Note: Caller might need to update local lock state if needed immediately
            return true;
        } catch (error) {
            console.error('Error updating lock name:', error);
            Alert.alert('Error', 'Failed to update lock name');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const disconnectProperty = async () => {
        if (!property?.id) {
            Alert.alert('Error', 'Property not found');
            return false;
        }
        setIsDeleting(true);
        try {
            const propertyRef = doc(db, 'properties', property.id);
            await deleteDoc(propertyRef);
            return true;
        } catch (error) {
            console.error('Error disconnecting property:', error);
            Alert.alert('Error', 'Failed to disconnect property');
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    const copyToClipboard = async (text: string, message = 'Copied to clipboard') => {
        await Clipboard.setStringAsync(text);
        Alert.alert('Success', message);
    };

    return {
        isSaving,
        isDeleting,
        updatePropertyField,
        addGuest,
        updateGuest,
        removeGuest,
        updateLockName,
        disconnectProperty,
        copyToClipboard,
        generatePin
    };
};
