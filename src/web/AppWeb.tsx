import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebNavigator from './navigation/WebNavigator';

export default function AppWeb() {
  return (
    <View style={styles.container}>
      <WebNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
