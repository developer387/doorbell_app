import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheet, Button } from '@/components';
import { Body, Title, SmallText } from '@/typography';
import { Copy, User } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import type { Guest } from '@/types/Property';
import * as Clipboard from 'expo-clipboard';

interface GuestSuccessSheetProps {
    isVisible: boolean;
    onClose: () => void;
    guest: Guest | null;
}

export const GuestSuccessSheet = ({ isVisible, onClose, guest }: GuestSuccessSheetProps) => {
    const handleCopyGuestPin = async () => {
        if (guest?.accessPin) {
            await Clipboard.setStringAsync(guest.accessPin);
        }
    };

    if (!guest) return null;

    return (
        <BottomSheet
            isVisible={isVisible}
            onClose={onClose}
            minHeight={450}
        >
            <View style={styles.container}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={[styles.avatarCircleLarge, { backgroundColor: guest.avatar === 'avatar1' ? '#4CAF50' : guest.avatar === 'avatar2' ? '#FFC107' : guest.avatar === 'avatar3' ? '#2196F3' : '#E91E63' }]}>
                        <User size={40} color="white" />
                    </View>
                    <Title style={{ marginTop: 10, textAlign: 'center' }}>Guest created successfully</Title>
                </View>

                <View style={styles.guestCard}>
                    <Body weight="bold">{guest.name}</Body>
                    <View style={styles.guestTimeRow}>
                        <SmallText variant="secondary">Start Time:</SmallText>
                        <SmallText>{new Date(guest.startTime).toLocaleString()}</SmallText>
                    </View>
                    <View style={styles.guestTimeRow}>
                        <SmallText variant="secondary">End Time:</SmallText>
                        <SmallText>{new Date(guest.endTime).toLocaleString()}</SmallText>
                    </View>
                </View>

                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <Body>Generated Access PIN:</Body>
                    <Title style={{ fontSize: 40, marginVertical: 10 }}>{guest.accessPin}</Title>
                    <TouchableOpacity style={styles.copyPinButton} onPress={handleCopyGuestPin}>
                        <Body variant="primary" style={{ textDecorationLine: 'underline' }}>Copy Access PIN</Body>
                        <Copy size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <Button
                    title="View Guest"
                    onPress={onClose}
                    style={styles.saveButton}
                />
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 0, // inherits from parent usually, but here checking
    },
    avatarCircleLarge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    guestCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    guestTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    copyPinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    saveButton: {
        marginTop: 0,
    }
});
