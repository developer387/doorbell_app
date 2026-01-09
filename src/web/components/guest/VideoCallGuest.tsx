/**
 * Production-Grade Guest Video Call Component
 * Guest can only join, never initiate - bulletproof state management
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, AlertCircle } from 'lucide-react-native';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ConnectionState,
  ConnectionDisconnectedReason
} from 'agora-rtc-sdk-ng';
import { agoraConfig } from '@/config/agora';

interface VideoCallGuestProps {
  requestId: string;
  onCallEnded: () => void;
  onError: (error: string) => void;
}

interface CallState {
  status: 'waiting' | 'joining' | 'connected' | 'ended' | 'error';
  error?: string;
  remoteUsers: IAgoraRTCRemoteUser[];
  localVideoEnabled: boolean;
  localAudioEnabled: boolean;
}

export const VideoCallGuest: React.FC<VideoCallGuestProps> = ({
  requestId,
  onCallEnded,
  onError,
}) => {
  const [callState, setCallState] = useState<CallState>({
    status: 'waiting',
    remoteUsers: [],
    localVideoEnabled: true,
    localAudioEnabled: true,
  });

  // Refs for Agora resources
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const isJoinedRef = useRef(false);
  const isJoiningRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Stable refs for props to avoid dependency cycles
  const onCallEndedRef = useRef(onCallEnded);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
    onErrorRef.current = onError;
  }, [onCallEnded, onError]);

  const leaveCall = useCallback(async () => {
    if (!clientRef.current || !isJoinedRef.current) {
      return;
    }

    try {
      // Unpublish local tracks
      if (localVideoTrackRef.current && localAudioTrackRef.current) {
        await clientRef.current.unpublish([
          localVideoTrackRef.current,
          localAudioTrackRef.current,
        ]);
      }

      // Leave channel
      await clientRef.current.leave();
      isJoinedRef.current = false;

      setCallState(prev => ({ ...prev, status: 'ended' }));
      onCallEndedRef.current();
    } catch (error) {
      console.error('Error leaving call:', error);
      // Force end even if leave fails
      setCallState(prev => ({ ...prev, status: 'ended' }));
      onCallEndedRef.current();
    }
  }, []);

  // Event handlers
  const handleUserPublished = useCallback(async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
    if (!clientRef.current) {
      return;
    }

    try {
      // Subscribe to remote user
      await clientRef.current.subscribe(user, mediaType);

      if (mediaType === 'video') {
        // Play remote video
        user.videoTrack?.play('remote-video');
      }

      if (mediaType === 'audio') {
        // Play remote audio
        user.audioTrack?.play();
      }

      setCallState(prev => ({
        ...prev,
        remoteUsers: prev.remoteUsers.some(u => u.uid === user.uid)
          ? prev.remoteUsers.map(u => u.uid === user.uid ? user : u)
          : [...prev.remoteUsers, user],
      }));
    } catch (error) {
      console.error('Error handling user published:', error);
    }
  }, []);

  const handleUserUnpublished = useCallback((user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
    console.log('User unpublished:', user.uid, mediaType);
  }, []);

  const handleUserLeft = useCallback((user: IAgoraRTCRemoteUser, reason: string) => {
    console.log('User left:', user.uid, reason);

    setCallState(prev => ({
      ...prev,
      remoteUsers: prev.remoteUsers.filter(u => u.uid !== user.uid),
    }));

    // If owner left, end call
    if (reason === 'Quit' || reason === 'ServerTimeOut') {
      leaveCall();
    }
  }, [leaveCall]);

  const handleConnectionStateChange = useCallback((
    curState: ConnectionState,
    revState: ConnectionState,
    reason?: ConnectionDisconnectedReason
  ) => {
    console.log('Connection state changed:', curState, revState, reason);

    if (curState === 'DISCONNECTED' || curState === 'DISCONNECTING') {
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Connection lost',
      }));
    }
  }, []);

  const handleException = useCallback((event: any) => {
    console.error('Agora exception:', event);
    setCallState(prev => ({
      ...prev,
      status: 'error',
      error: 'Video call error occurred',
    }));
  }, []);

  const initializeAgoraClient = useCallback(async () => {
    try {
      // Create Agora client
      const client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
      });

      // Setup event listeners - using current function references
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);
      client.on('connection-state-change', handleConnectionStateChange);
      client.on('exception', handleException);

      clientRef.current = client;

      // Create local tracks
      const [videoTrack, audioTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          // Audio config
          encoderConfig: 'music_standard',
        },
        {
          // Video config
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMax: 400,
            bitrateMin: 200,
          },
        }
      );

      localVideoTrackRef.current = videoTrack;
      localAudioTrackRef.current = audioTrack;

      console.log('Agora client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Agora client:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to initialize video call',
      }));
      onErrorRef.current('Failed to initialize video call');
    }
  }, [handleUserPublished, handleUserUnpublished, handleUserLeft, handleConnectionStateChange, handleException]);

  // Initialize Agora client
  useEffect(() => {
    initializeAgoraClient();

    return () => {
      cleanup();
    };
  }, [initializeAgoraClient]);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Stop local tracks
    localVideoTrackRef.current?.stop();
    localVideoTrackRef.current?.close();
    localAudioTrackRef.current?.stop();
    localAudioTrackRef.current?.close();

    // Leave channel if joined
    if (clientRef.current && isJoinedRef.current) {
      clientRef.current.leave().catch(console.error);
    }

    // Reset refs
    clientRef.current = null;
    localVideoTrackRef.current = null;
    localAudioTrackRef.current = null;
    isJoinedRef.current = false;
    isJoiningRef.current = false;
  }, []);

  const joinCall = useCallback(async (token: string, channelName: string, uid: number) => {
    if (!clientRef.current || isJoinedRef.current || isJoiningRef.current) {
      return;
    }

    isJoiningRef.current = true;

    try {
      setCallState(prev => ({ ...prev, status: 'joining' }));

      // Join channel
      await clientRef.current.join(agoraConfig.appId, channelName, token, uid);
      isJoinedRef.current = true;

      // Publish local tracks
      if (localVideoTrackRef.current && localAudioTrackRef.current) {
        await clientRef.current.publish([
          localVideoTrackRef.current,
          localAudioTrackRef.current,
        ]);

        // Play local video
        localVideoTrackRef.current.play('local-video');
      }

      setCallState(prev => ({ ...prev, status: 'connected' }));
      console.log('Successfully joined call');
    } catch (error) {
      console.error('Failed to join call:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to join video call',
      }));
      onErrorRef.current('Failed to join video call');
    } finally {
      // Don't reset isJoiningRef if successful to prevent re-join attempts
      // Only reset if we truly failed and want to allow retry via some mechanism,
      // but for now, let's keep it true to be safe against the polling loop.
      if (!isJoinedRef.current) {
        isJoiningRef.current = false;
      }
    }
  }, []);

  // Listen for join signal from server
  useEffect(() => {
    const checkForJoinSignal = async () => {
      try {
        // Poll server for join signal
        const response = await fetch(`/api/calls/join-signal/${requestId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.canJoin && data.token) {
            await joinCall(data.token, data.channelName, data.uid);
          }
        }
      } catch (error) {
        console.error('Error checking join signal:', error);
      }
    };

    const interval = setInterval(checkForJoinSignal, 2000);
    return () => clearInterval(interval);
  }, [requestId, joinCall]);

  const toggleLocalVideo = useCallback(async () => {
    if (!localVideoTrackRef.current) {
      return;
    }

    try {
      const enabled = !callState.localVideoEnabled;
      await localVideoTrackRef.current.setEnabled(enabled);

      setCallState(prev => ({
        ...prev,
        localVideoEnabled: enabled,
      }));
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }, [callState.localVideoEnabled]);

  const toggleLocalAudio = useCallback(async () => {
    if (!localAudioTrackRef.current) {
      return;
    }

    try {
      const enabled = !callState.localAudioEnabled;
      await localAudioTrackRef.current.setEnabled(enabled);

      setCallState(prev => ({
        ...prev,
        localAudioEnabled: enabled,
      }));
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }, [callState.localAudioEnabled]);

  const renderWaitingScreen = () => (
    <View style={styles.waitingContainer}>
      <ActivityIndicator size="large" color="#4ade80" />
      <Text style={styles.waitingTitle}>Waiting for Owner</Text>
      <Text style={styles.waitingText}>
        The property owner will start the video call shortly.
      </Text>
    </View>
  );

  const renderJoiningScreen = () => (
    <View style={styles.waitingContainer}>
      <ActivityIndicator size="large" color="#4ade80" />
      <Text style={styles.waitingTitle}>Joining Call</Text>
      <Text style={styles.waitingText}>
        Connecting to video call...
      </Text>
    </View>
  );

  const renderErrorScreen = () => (
    <View style={styles.errorContainer}>
      <AlertCircle size={64} color="#ef4444" />
      <Text style={styles.errorTitle}>Call Failed</Text>
      <Text style={styles.errorText}>
        {callState.error || 'An unexpected error occurred'}
      </Text>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onCallEnded}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveCall = () => (
    <View style={styles.callContainer}>
      {/* Remote Video */}
      <div id="remote-video" style={styles.remoteVideo as any} />

      {/* Local Video */}
      <div id="local-video" style={styles.localVideo as any} />

      {/* Call Controls */}
      <View style={styles.callControls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            !callState.localVideoEnabled && styles.controlButtonDisabled,
          ]}
          onPress={toggleLocalVideo}
        >
          {callState.localVideoEnabled ? (
            <Video size={24} color="white" />
          ) : (
            <VideoOff size={24} color="white" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !callState.localAudioEnabled && styles.controlButtonDisabled,
          ]}
          onPress={toggleLocalAudio}
        >
          {callState.localAudioEnabled ? (
            <Mic size={24} color="white" />
          ) : (
            <MicOff size={24} color="white" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={leaveCall}
        >
          <PhoneOff size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.callInfoText}>
          Connected with Property Owner
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (callState.status) {
      case 'waiting':
        return renderWaitingScreen();

      case 'joining':
        return renderJoiningScreen();

      case 'connected':
        return renderActiveCall();

      case 'error':
        return renderErrorScreen();

      case 'ended':
        return (
          <View style={styles.endedContainer}>
            <Text style={styles.endedText}>Call Ended</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCallEnded}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return renderWaitingScreen();
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  waitingText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  callContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#222',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#333',
    border: '2px solid #4ade80',
  },
  callControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  callInfoText: {
    color: 'white',
    fontSize: 14,
  },
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
});