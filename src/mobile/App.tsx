import React from 'react';
import { RootNavigator } from '@navigation';
import { UserProvider } from '@/context/UserContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <UserProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </UserProvider>
  );
}
