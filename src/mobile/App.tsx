import React, { useCallback } from 'react';
import { RootNavigator } from '@navigation';
import { UserProvider, useAuth } from '@/context/UserContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationData } from '@/services/notifications.service';

// Wrapper component to access auth context for notifications
const NotificationHandler = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const handleNotificationReceived = useCallback((data: NotificationData) => {
    console.log('[App] Notification received in foreground:', data);
    // Could show an in-app alert or update UI
  }, []);

  const handleNotificationTapped = useCallback((data: NotificationData) => {
    console.log('[App] Notification tapped:', data);
    // Navigate to the relevant property/call screen
    // This would need navigation ref to work properly
    if (data.propertyId) {
      // TODO: Navigate to property with propertyId
      console.log('[App] Should navigate to property:', data.propertyId);
    }
  }, []);

  useNotifications({
    userId: user?.uid,
    onNotificationReceived: handleNotificationReceived,
    onNotificationTapped: handleNotificationTapped,
  });

  return <>{children}</>;
};

export default function App() {
  return (
    <UserProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <NotificationHandler>
          <RootNavigator />
        </NotificationHandler>
      </SafeAreaProvider>
    </UserProvider>
  );
}
