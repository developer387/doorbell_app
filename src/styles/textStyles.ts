import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const textStyles = StyleSheet.create({
  base: {
    fontFamily: 'System', // Using System font for now as custom fonts weren't provided, but would ideally be a serif for the logo and sans-serif for body
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
    color: colors.black,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.black,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textSecondary,
  },
  medium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  extraSmall: {
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 12,
  },
  // Variants
  primary: {
    color: colors.primary,
  },
  black: {
    color: colors.black,
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
