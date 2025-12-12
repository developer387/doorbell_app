import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Body, SmallText, Title } from '@/typography';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { type Property } from '@/types/Property';

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

interface Props {
    property: Property | null;
    isGuestAccessEnabled: boolean;
    onToggleGuestAccess: (val: boolean) => void;
    onEditName: () => void;
    onOpenPin: () => void;
    onDisconnect: () => void;
}

export const PropertyDetailsTab = ({
    property,
    isGuestAccessEnabled,
    onToggleGuestAccess,
    onEditName,
    onOpenPin,
    onDisconnect
}: Props) => {
    return (
        <ScrollView style={styles.contentScroll}>
            <View>
                <View style={styles.sectionHeader}>
                    <Body weight="bolder">Property Details</Body>
                    <TouchableOpacity onPress={onEditName}>
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
                    onValueChange={onToggleGuestAccess}
                    value={isGuestAccessEnabled}
                    trackColor={{ false: '#767577', true: '#4CAF50' }}
                    thumbColor={'#f4f3f4'}
                />
            </View>

            <TouchableOpacity style={styles.actionRow} onPress={onOpenPin}>
                <View style={styles.textBlock}>
                    <Body weight="bolder">Property PIN Code</Body>
                    <Body variant="secondary">
                        This will be required for guest to have access to the property.
                    </Body>
                </View>
                <ChevronRight size={24} color={colors.dark} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSection} onPress={onDisconnect}>
                <View style={styles.textBlock}>
                    <Body variant="error">Disconnect Door Bell</Body>
                    <SmallText variant="secondary">
                        You will loose all the details about this property.
                    </SmallText>
                </View>
                <ChevronRight size={24} color={colors.dark} />
            </TouchableOpacity>
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
    textBlock: {
        flex: 1,
        paddingRight: 10,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    actionSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        marginBottom: 50,
    },
});
