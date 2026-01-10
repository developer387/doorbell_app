/**
 * ZegoCloud Guest Video Call Component
 * Handles the "Ring -> Countdown -> Send Video -> Wait -> Call" flow.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { ZIM } from 'zego-zim-web';

const APP_ID = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
const SERVER_SECRET = process.env.EXPO_PUBLIC_ZEGO_SERVER_SECRET || '';

interface VideoCallGuestProps {
  requestId: string;
  onCallEnded: () => void;
  onError: (error: string) => void;
  guestName?: string;
}

export const VideoCallGuest: React.FC<VideoCallGuestProps> = ({
  requestId,
  onCallEnded,
  onError,
  guestName = 'Guest',
}) => {
  const [status, setStatus] = useState<'countdown' | 'sending' | 'waiting' | 'call'>('countdown');
  const [count, setCount] = useState(5);
  const containerRef = useRef<any>(null);
  const zpRef = useRef<any>(null);

  // 1. Countdown Logic (5 seconds)
  useEffect(() => {
    if (status === 'countdown') {
      const interval = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStatus('sending');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // 2. Simulate "Sending Video" (Transition to waiting)
  useEffect(() => {
    if (status === 'sending') {
      const timer = setTimeout(() => {
        setStatus('waiting');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // 3. Waiting Logic - Initialize Zego for Invitation
  useEffect(() => {
    if (status === 'waiting' && containerRef.current && !zpRef.current) {
      const initZego = async () => {
        try {
          const userID = requestId;
          const userName = guestName || 'Guest';

          // For invitation scenario, we initialize with USER credentials
          const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            APP_ID,
            SERVER_SECRET,
            userID,
            userID,
            userName
          );

          const zp = ZegoUIKitPrebuilt.create(kitToken);
          zpRef.current = zp;

          // Add ZIM plugin for Call Invitation
          zp.addPlugins({ ZIM });

          zp.setCallInvitationConfig({
            enableCustomCallInvitationWaitingPage: false,
            onIncomingCallDeclineButtonPressed: () => {
              // Handle decline if needed
            },
            onIncomingCallAcceptButtonPressed: () => {
              setStatus('call');
            }
          });

          console.log('Zego Invitation Service Ready. Waiting for call...', userID);

        } catch (error: any) {
          console.error('Failed to initialize Zego:', error);
          onError(error.message || 'Failed to init Zego');
        }
      };

      initZego();
    }
  }, [status, requestId, guestName, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, []);


  if (status === 'countdown') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.countdownText}>{count}</Text>
        <Text style={styles.subText}>Recording video message...</Text>
      </View>
    );
  }

  if (status === 'sending') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0055FF" />
        <Text style={styles.subText}>Sending video...</Text>
      </View>
    );
  }

  if (status === 'waiting') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.waitingText}>Waiting for property owner to join...</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCallEnded}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active Call (Handled by Zego Overlay, but we provide container/placeholder)
  return (
    <View style={styles.container}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100vh', backgroundColor: '#000' }}
      />
      <TouchableOpacity style={styles.closeButton} onPress={onCallEnded}>
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#FF5500',
    marginBottom: 20,
  },
  subText: {
    fontSize: 18,
    color: '#ccc',
    marginTop: 20,
  },
  waitingText: {
    fontSize: 20,
    color: 'white',
    marginTop: 20,
    marginBottom: 40,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    zIndex: 1000,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});