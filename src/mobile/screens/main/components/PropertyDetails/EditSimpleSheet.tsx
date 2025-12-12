import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheet, Input, Button } from '@/components';
import { Body } from '@/typography';
import { X } from 'lucide-react-native';
import { colors } from '@/styles/colors';

interface SimpleSheetProps {
    isVisible: boolean;
    onClose: () => void;
    title: string;
    initialValue: string;
    placeholder: string;
    label: string;
    onSave: (value: string) => Promise<void>;
    isLoading: boolean;
}

export const EditSimpleSheet = ({
    isVisible,
    onClose,
    title,
    initialValue,
    placeholder,
    label,
    onSave,
    isLoading
}: SimpleSheetProps) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isVisible) {
            setValue(initialValue);
        }
    }, [isVisible, initialValue]);

    return (
        <BottomSheet
            isVisible={isVisible}
            onClose={onClose}
            minHeight={300}
        >
            <View style={styles.sheetHeader}>
                <Body weight="bolder">{title}</Body>
                <TouchableOpacity onPress={onClose}>
                    <X size={24} color={colors.dark} />
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <Input
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    label={label}
                />
                <Button
                    title="Save Changes"
                    onPress={() => onSave(value)}
                    isLoading={isLoading}
                    disabled={!value.trim()}
                    style={styles.saveButton}
                />
            </View>
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
    inputContainer: {
        gap: 24,
        paddingVertical: 20,
    },
    saveButton: {
        marginTop: 16,
    },
});
