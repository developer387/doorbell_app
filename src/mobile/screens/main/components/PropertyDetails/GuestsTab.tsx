import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Body, SmallText, Title } from '@/typography';
import { User, Copy } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { type Property, type Guest } from '@/types/Property';

interface Props {
    property: Property | null;
    onAddGuest: () => void;
    onEditGuest: (guest: Guest) => void;
    onRemoveGuest: (guest: Guest) => void;
    onCopyPin: (pin: string) => void;
}

export const GuestsTab = ({
    property,
    onAddGuest,
    onEditGuest,
    onRemoveGuest,
    onCopyPin
}: Props) => {
    return (
        <ScrollView style={styles.contentScroll}>
            <View style={styles.sectionHeader}>
                <Body weight="bolder">My Guests</Body>
                <TouchableOpacity onPress={onAddGuest}>
                    <Body variant="primary">+ Add Guest</Body>
                </TouchableOpacity>
            </View>

            <View style={styles.guestsContainer}>
                {property?.guests && property.guests.length > 0 ? (
                    property.guests.map((guest) => (
                        <View key={guest.id} style={styles.guestCard}>
                            <View style={styles.guestCardHeader}>
                                <View style={styles.guestInfo}>
                                    <View style={[styles.avatarCircle, { backgroundColor: guest.avatar === 'avatar1' ? '#4CAF50' : guest.avatar === 'avatar2' ? '#FFC107' : guest.avatar === 'avatar3' ? '#2196F3' : '#E91E63' }]}>
                                        <User size={20} color="white" />
                                    </View>
                                    <Body weight="bold">{guest.name}</Body>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 16 }}>
                                    <TouchableOpacity onPress={() => onEditGuest(guest)}>
                                        <SmallText variant="primary">Edit</SmallText>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onRemoveGuest(guest)}>
                                        <SmallText variant="error">Remove</SmallText>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.guestTimeRow}>
                                <SmallText variant="secondary">Start Time:</SmallText>
                                <SmallText>{new Date(guest.startTime).toLocaleString()}</SmallText>
                            </View>
                            <View style={styles.guestTimeRow}>
                                <SmallText variant="secondary">End Time:</SmallText>
                                <SmallText>{new Date(guest.endTime).toLocaleString()}</SmallText>
                            </View>

                            <View style={styles.guestPinRow}>
                                <TouchableOpacity style={styles.copyPinButton} onPress={() => onCopyPin(guest.accessPin)}>
                                    <Body variant="primary" style={{ textDecorationLine: 'underline' }}>Copy Access PIN</Body>
                                    <Copy size={16} color={colors.primary} />
                                </TouchableOpacity>
                                <Title>{guest.accessPin}</Title>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyGuests}>
                        <Body variant="secondary">No guests added yet</Body>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    contentScroll: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    guestsContainer: {
        paddingBottom: 20
    },
    guestCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    guestCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 12
    },
    guestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    avatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    guestTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    guestPinRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8
    },
    emptyGuests: {
        alignItems: 'center',
        padding: 30
    },
    copyPinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    }
});
