import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const buttonStyles = StyleSheet.create({
    container: {
        borderRadius: 12,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        width: '100%',
    },
    primary: {
        backgroundColor: colors.primary,
        borderWidth: 0,
    },
    secondary: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
    textPrimary: {
        color: colors.white,
    },
    textSecondary: {
        color: colors.text,
    },
    leftIcon: {
        marginRight: 12,
    },
    leftIconAbsolute: {
        position: 'absolute',
        left: 16,
    },
});
