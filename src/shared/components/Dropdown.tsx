import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    StyleSheet,
    FlatList,
    Pressable,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { MediumText, Body, Heading } from '@/typography';

interface DropdownProps {
    label?: string;
    placeholder: string;
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
}

export const Dropdown: React.FC<DropdownProps> = ({
    label,
    placeholder,
    value,
    onValueChange,
    options,
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    const handleSelect = (item: string) => {
        onValueChange(item);
        setModalVisible(false);
    };

    return (
        <View>
            {label && <MediumText weight="normal" variant="black">{label}</MediumText>}
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setModalVisible(true)}
            >
                <Body variant={value ? 'black' : 'secondary'}>
                    {value || placeholder}
                </Body>
                <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Heading weight="bold" variant="black">Select {label || 'Option'}</Heading>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        value === item && styles.selectedOption,
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Body
                                        variant={value === item ? 'white' : 'black'}
                                        weight={value === item ? 'bold' : 'normal'}
                                    >
                                        {item}
                                    </Body>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Body variant="secondary">Cancel</Body>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.dark,
        marginBottom: 8,
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.white,
    },
    selectedText: {
        fontSize: 15,
        color: colors.dark,
    },
    placeholderText: {
        fontSize: 15,
        color: '#94a3b8',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 16,
        width: '80%',
        maxHeight: '60%',
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.dark,
        marginBottom: 16,
    },
    optionItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    selectedOption: {
        backgroundColor: colors.primary,
    },
    optionText: {
        fontSize: 16,
        color: colors.dark,
    },
    selectedOptionText: {
        color: colors.white,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    closeButtonText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});
