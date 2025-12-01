import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { LucideIcon } from 'lucide-react-native';

interface FilterChipProps {
    label: string;
    isSelected: boolean;
    onPress: () => void;
    Icon?: LucideIcon;
}

export const FilterChip: React.FC<FilterChipProps> = ({
    label,
    isSelected,
    onPress,
    Icon,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                isSelected ? styles.selectedContainer : styles.unselectedContainer,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {Icon && (
                <Icon
                    size={16}
                    color={isSelected ? colors.white : colors.textSecondary}
                    style={styles.icon}
                />
            )}
            <Text
                style={[
                    styles.label,
                    isSelected ? styles.selectedLabel : styles.unselectedLabel,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    selectedContainer: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    unselectedContainer: {
        backgroundColor: colors.white,
        borderColor: colors.border,
    },
    icon: {
        marginRight: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    selectedLabel: {
        color: colors.white,
    },
    unselectedLabel: {
        color: colors.textSecondary,
    },
});
