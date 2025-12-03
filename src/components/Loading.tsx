import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/styles/colors';
import React from 'react';

export const Loading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator color={colors.primary} size="large" />
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
