import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheet, Input, Button } from '@/components';
import { Body, Title } from '@/typography';
import { X, Copy } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import * as Clipboard from 'expo-clipboard';

interface PinSheetProps {
    isVisible: boolean;
    onClose: () => void;
    currentPin?: string;
    onSave: (pin: string) => Promise<void>;
    isLoading: boolean;
}

export const PinSheet = ({ isVisible, onClose, currentPin, onSave, isLoading }: PinSheetProps) => {
    const [pinCode, setPinCode] = useState('');
    const [pinError, setPinError] = useState('');

    useEffect(() => {
        if (isVisible) {
            setPinCode('');
            setPinError('');
        }
    }, [isVisible]);

    const handlePinChange = (text: string) => {
        if (/^\d*$/.test(text) && text.length <= 4) {
            setPinCode(text);
            setPinError('');
        }
    };

    const handleSave = async () => {
        if (pinCode.length !== 4) {
            setPinError('PIN must be exactly 4 digits');
            return;
        }
        await onSave(pinCode);
    };

    const handleCopyPin = async () => {
        if (currentPin) {
            await Clipboard.setStringAsync(currentPin);
        }
    };

    return (
        <BottomSheet
            isVisible={isVisible}
            onClose={onClose}
            minHeight={350}
        >
            <View style={styles.sheetHeader}>
                <Body weight="bolder">Property PIN Code</Body>
                <TouchableOpacity onPress={onClose}>
                    <X size={24} color={colors.dark} />
                </TouchableOpacity>
            </View>

            {currentPin && !pinCode ? (
                <View style={styles.pinDisplayContainer}>
                    <Title style={styles.pinText}>{currentPin}</Title>
                    <TouchableOpacity style={styles.copyButton} onPress={handleCopyPin}>
                        <Body variant="primary" style={styles.underlineText}>Copy Code</Body>
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
                        onPress={handleSave}
                        disabled={pinCode.length !== 4}
                        isLoading={isLoading}
                        style={styles.saveButton}
                    />
                </View>
            )}
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
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
    underlineText: {
        textDecorationLine: 'underline',
    },
});
