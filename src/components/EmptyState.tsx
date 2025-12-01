import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { Button } from './Button';
import { Image as LucideImage, Plus } from 'lucide-react-native';

interface EmptyStateProps {
    onAddProperty: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddProperty }) => {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <LucideImage size={64} color={colors.border} />
                <View style={styles.plusIconBadge}>
                    <Plus size={24} color={colors.white} />
                </View>
            </View>

            <Text style={styles.text}>
                No property has not been added yet.{'\n'}Click the button below to add a{'\n'}property
            </Text>

            <Button
                title="Add Property"
                onPress={onAddProperty}
                style={styles.button}
                leftIcon={<Plus size={20} color={colors.white} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        marginTop: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        backgroundColor: '#F5F7FA',
        borderRadius: 60,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    plusIconBadge: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: colors.border,
        borderRadius: 15,
        padding: 4,
    },
    text: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    button: {
        minWidth: 200,
        backgroundColor: colors.primary,
    },
});
