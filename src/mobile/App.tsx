import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { RootNavigator } from '@navigation';
import { UserProvider, useAuth } from '@/context/UserContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationData } from '@/services/notifications.service';
import { navigate } from '@navigation/navigationRef';

// Wrapper component to access auth context for notifications
const NotificationHandler = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const handleNotificationReceived = useCallback((data: NotificationData) => {
    console.log('[App] Notification received in foreground:', data);
    // Show an in-app alert for incoming calls
    if (data.type === 'incoming_call' && data.propertyId) {
      Alert.alert(
        'Incoming Doorbell Call',
        `Someone is at ${data.propertyName || 'your property'}`,
        [
          { text: 'Dismiss', style: 'cancel' },
          {
            text: 'Answer',
            onPress: () => {
              navigate('PropertyDetails', { propertyId: data.propertyId, initialTab: 'request' });
            },
          },
        ],
        { cancelable: true }
      );
    }
  }, []);

  const handleNotificationTapped = useCallback((data: NotificationData) => {
    console.log('[App] Notification tapped:', data);
    // Navigate to the relevant property/call screen
    if (data.propertyId) {
      navigate('PropertyDetails', { propertyId: data.propertyId, initialTab: 'request' });
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
