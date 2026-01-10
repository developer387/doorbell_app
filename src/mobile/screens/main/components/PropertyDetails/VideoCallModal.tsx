import React, { useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { useCallManager } from '@/hooks/useCallManager';

// Using provided credentials
const APP_ID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
const APP_SIGN = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || '';

interface VideoCallModalProps {
  visible: boolean;
  requestId: string;
  onClose: () => void;
  guestName?: string; // Kept for compatibility with parent usage
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  visible,
  requestId,
  onClose,
}) => {
  const { startCall, endCall } = useCallManager();

  // Notify server when call starts (so guest can join)
  useEffect(() => {
    if (visible) {
      startCall(requestId);
    }
  }, [visible, requestId, startCall]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <ZegoUIKitPrebuiltCall
          appID={APP_ID}
          appSign={APP_SIGN}
          userID={'owner_id'}
          userName={'Property Owner'}
          callID={requestId}
          config={{
            ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
            // Empty callback keeps the call active while waiting
            onOnlySelfInRoom: () => { },
            onHangUp: () => {
              endCall(requestId);
              onClose();
            },
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});