import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BottomSheet, Button } from '@/components';
import { Body, Title, SmallText } from '@/typography';
import { X } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import type { Property } from '@/types/Property';

interface DisconnectSuccessSheetProps {
    isVisible: boolean;
    onClose: () => void;
    property: Property | null;
}

export const DisconnectSuccessSheet = ({ isVisible, onClose, property }: DisconnectSuccessSheetProps) => {
    return (
        <BottomSheet
            isVisible={isVisible}
            onClose={() => { }} // Prevent manual close
            enablePanGesture={false}
            closeOnBackdropPress={false}
            minHeight={400}
        >
            <View style={styles.successSheetContainer}>
                <View style={styles.closeButtonContainer}>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color={colors.dark} />
                    </TouchableOpacity>
                </View>

                <View style={styles.successIconContainer}>
                    {/* Note: Path might need adjustment depending on where this component is relative to assets */}
                    <Image
                        source={require('../../../../../../assets/disconnect.png')}
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
                    onPress={onClose}
                    style={styles.doneButton}
                />
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
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
        borderColor: colors.borderColor,
        borderRadius: 12,
        marginBottom: 24,
    },
    houseIconPlaceholder: {
        width: 40,
        height: 40,
        backgroundColor: colors.borderColor,
        borderRadius: 8,
    },
    successNote: {
        marginBottom: 24,
        textAlign: 'center',
    },
    doneButton: {
        width: '100%',
    },
});
