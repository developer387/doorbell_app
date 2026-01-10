import React, { useEffect } from 'react';
import { RootNavigator } from '@navigation';
import { UserProvider } from '@/context/UserContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ZegoUIKitPrebuiltCallFloatingMinimizedView } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import ZegoUIKitPrebuiltCallService from '@zegocloud/zego-uikit-prebuilt-call-rn';
import ZegoUIKitSignalingPlugin from '@zegocloud/zego-uikit-signaling-plugin-rn';

export default function App() {
  useEffect(() => {
    // Initialize Zego Service
    ZegoUIKitPrebuiltCallService.init(
      Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID),
      process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || '',
      'owner_id', // userID
      'Property Owner', // userName
      [ZegoUIKitSignalingPlugin],
      {
        ringtoneConfig: {
          incomingCallFileName: 'zego_incoming',
          outgoingCallFileName: 'zego_outgoing',
        },
        androidNotificationConfig: {
          channelID: 'call',
          channelName: 'Call Notification',
        },
      }
    );

    return () => {
      // De-initialize on unmount
      ZegoUIKitPrebuiltCallService.uninit();
    };
  }, []);

  return (
    <UserProvider>
      <SafeAreaProvider>
        <ZegoUIKitPrebuiltCallFloatingMinimizedView>
          <StatusBar style="auto" />
          <RootNavigator />
        </ZegoUIKitPrebuiltCallFloatingMinimizedView>
      </SafeAreaProvider>
    </UserProvider>
  );
}
