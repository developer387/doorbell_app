import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '@/styles/colors';

interface SearchInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onSearch?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChangeText,
    placeholder = 'Search property',
    onSearch,
}) => {
    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity onPress={onSearch} style={styles.iconContainer}>
                <Search size={20} color={colors.black} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: '100%',
    },
    iconContainer: {
        marginLeft: 8,
    },
});
