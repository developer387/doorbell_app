import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const inputStyles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.white,
        height: 56,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: '100%',
      marginLeft: -4,
    },
    inputError: {
        borderColor: colors.error,
        backgroundColor: colors.white,
    },
    inputSuccess: {
        borderColor: colors.success,
    },
    inputFocus: {
        borderColor: colors.primary,
        borderWidth: 1.5,
    },
    errorText: {
        marginTop: 6,
        marginLeft: 4,
    },
    iconRight: {
        marginLeft: 8,
    },
    floatingLabel: {
        position: 'absolute',
        top: 8,
    },
    inputWithFloatingLabel: {
        paddingTop: 16,
        paddingBottom: 0,
    }
});
