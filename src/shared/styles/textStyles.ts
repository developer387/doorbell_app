import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const textStyles = StyleSheet.create({
  base: {
    fontFamily: 'System',
    color: colors.black,
  },

  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  medium: {
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
  },
  extraSmall: {
    fontSize: 10,
    lineHeight: 12,
  },

  light: {
    fontWeight: '300' as const,
  },
  normal: {
    fontWeight: '400' as const,
  },
  bold: {
    fontWeight: '600' as const,
  },
  bolder: {
    fontWeight: '700' as const,
  },

  primary: {
    color: colors.primary,
  },
  black: {
    color: colors.black,
  },
  secondary: {
    color: colors.textSecondary,
  },
  success: {
    color: colors.success,
  },
  error: {
    color: colors.error,
  },
  white: {
    color: colors.white,
  },

  center: {
    textAlign: 'center',
  },
});
