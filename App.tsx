import React from 'react';
import { RootNavigator } from '@/navigation';
import { UserProvider } from '@/context/UserContext';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <UserProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </UserProvider>
  );
}
