import React from 'react';
import { RootNavigator } from '@/navigation';
import { UserProvider } from '@/context/UserContext';

export default function App() {
  return (
    <UserProvider>
      <RootNavigator />
    </UserProvider>
  );
}
