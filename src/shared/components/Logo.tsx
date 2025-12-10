import { StyleSheet, View } from 'react-native';
import { SmallText, Title } from '../typography';
import React from 'react';
import { colors } from '../styles/colors';

interface LogoProps {
  title: string;
  description: string;
}

export const Logo = ({ title, description }: LogoProps) => (
  <View style={styles.logoContainer}>
    <View style={styles.logoBox}>
      <View style={styles.logoInner} />
      <View style={styles.logoBottomLine} />
    </View>
    <Title style={styles.logoText}>{title}</Title>
    <SmallText style={styles.logoSubText}>{description}</SmallText>
  </View>
);

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  logoBox: {
    width: 40,
    height: 52,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
  },
  logoInner: {
    width: 26,
    height: 26,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.black,
    borderTopWidth: 0,
    marginBottom: 4,
  },
  logoBottomLine: {
    width: 6,
    height: 2,
    backgroundColor: colors.black,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  logoSubText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
})
