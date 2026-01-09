/**
 * Production-Grade Call Manager Hook
 * Orchestrates state machine, services, and Agora manager
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CallStateMachine } from '../domain/call/CallStateMachine';
import { CallService } from '../services/call/CallService';
import { AgoraManager } from '../services/call/AgoraManager';
import { CallState, CallError, AgoraToken } from '../domain/call/types';

export interface UseCallManagerOptions {
  autoInitialize?: boolean;
  onCallStarted?: (requestId: string) => void;
  onCallEnded?: (requestId: string, reason: string) => void;
  onError?: (error: CallError) => void;
}

export interface CallManagerActions {
  startCall: (requestId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleLocalVideo: () => Promise<void>;
  toggleLocalAudio: () => Promise<void>;
  muteRemoteVideo: (uid: number, muted: boolean) => Promise<void>;
  muteRemoteAudio: (uid: number, muted: boolean) => Promise<void>;
  reset: () => void;
}

export interface CallManagerState {
  state: CallState;
  isInitialized: boolean;
  mediaState: {
    localVideoEnabled: boolean;
    localAudioEnabled: boolean;
    remoteVideoEnabled: boolean;
    remoteAudioEnabled: boolean;
  };
  connectionInfo: {
    channel: string | null;
    uid: number | null;
    joined: boolean;
  };
}

export function useCallManager(options: UseCallManagerOptions = {}): [CallManagerState, CallManagerActions] {
  const {
    autoInitialize = true,
    onCallStarted,
    onCallEnded,
    onError,
  } = options;

  // Singleton instances
  const stateMachineRef = useRef<CallStateMachine | null>(null);
  const callServiceRef = useRef<CallService | null>(null);
  const agoraManagerRef = useRef<AgoraManager | null>(null);

  // State
  const [state, setState] = useState<CallState>({ type: 'idle' });
  const [isInitialized, setIsInitialized] = useState(false);
  const [mediaState, setMediaState] = useState({
    localVideoEnabled: false,
    localAudioEnabled: false,
    remoteVideoEnabled: false,
    remoteAudioEnabled: false,
  });
  const [connectionInfo, setConnectionInfo] = useState({
    channel: null as string | null,
    uid: null as number | null,
    joined: false,
  });

  // Stable callback refs to prevent re-renders
  const onCallStartedRef = useRef(onCallStarted);
  const onCallEndedRef = useRef(onCallEnded);
  const onErrorRef = useRef(onError);

  // Update refs when props change
  useEffect(() => {
    onCallStartedRef.current = onCallStarted;
    onCallEndedRef.current = onCallEnded;
    onErrorRef.current = onError;
  }, [onCallStarted, onCallEnded, onError]);

  // Define stable callbacks
  const initializeAgora = useCallback(async () => {
    if (!agoraManagerRef.current || isInitialized) {
      return;
    }

    try {
      await agoraManagerRef.current.initialize();
      setIsInitialized(true);
    } catch (error) {
      const callError = error as CallError;
      onErrorRef.current?.(callError);
      stateMachineRef.current?.dispatch({ type: 'ERROR', error: callError });
    }
  }, [isInitialized]);

  const handleRequestingToken = useCallback(async (requestId: string) => {
    if (!callServiceRef.current) {
      return;
    }

    try {
      // Request permissions first
      await callServiceRef.current.requestPermissions();
      
      // Request token
      const token = await callServiceRef.current.requestToken({
        requestId,
        role: 'host', // Owner is always host
      });

      stateMachineRef.current?.dispatch({ type: 'TOKEN_RECEIVED', token });
    } catch (error) {
      const callError = error as CallError;
      stateMachineRef.current?.dispatch({ type: 'ERROR', error: callError });
    }
  }, []);

  const handleTokenReceived = useCallback(async (token: AgoraToken) => {
    if (!agoraManagerRef.current || !callServiceRef.current) {
      return;
    }

    try {
      // Setup Agora event handlers
      const agoraEvents = {
        onUserJoined: (uid: number) => {
          console.log(`User joined: ${uid}`);
          stateMachineRef.current?.dispatch({ type: 'GUEST_JOINED', uid });
        },
        onUserLeft: (uid: number, reason: number) => {
          console.log(`User left: ${uid}, reason: ${reason}`);
          stateMachineRef.current?.dispatch({ type: 'PARTICIPANT_LEFT', uid });
        },
        onConnectionStateChanged: (state: number, reason: number) => {
          console.log(`Connection state: ${state}, reason: ${reason}`);
          // Handle connection issues
          if (state === 5) { // Failed
            const error: CallError = {
              code: 'CONNECTION_FAILED',
              message: `Connection failed: ${reason}`,
              recoverable: true,
              timestamp: Date.now(),
            };
            stateMachineRef.current?.dispatch({ type: 'ERROR', error });
          }
        },
        onError: (error: CallError) => {
          stateMachineRef.current?.dispatch({ type: 'ERROR', error });
        },
        onTokenPrivilegeWillExpire: () => {
          console.warn('Token will expire - should refresh');
          // TODO: Implement token refresh
        },
      };

      // Join channel
      await agoraManagerRef.current.joinChannel(token, agoraEvents);
      
      // Get current state to access session
      const currentState = stateMachineRef.current?.getState();
      const requestId = currentState?.type === 'token_received' ? currentState.session.requestId : '';
      
      // Notify server
      await callServiceRef.current.notifyCallStarted(requestId, token.channelName);

      // Dispatch owner joined
      stateMachineRef.current?.dispatch({ type: 'OWNER_JOINED', uid: token.uid });
      
      onCallStartedRef.current?.(requestId);
    } catch (error) {
      const callError = error as CallError;
      stateMachineRef.current?.dispatch({ type: 'ERROR', error: callError });
    }
  }, []);

  const handleCallEnding = useCallback(async (requestId: string) => {
    if (!agoraManagerRef.current || !callServiceRef.current) {
      return;
    }

    try {
      // Leave channel
      await agoraManagerRef.current.leaveChannel();
      
      // Notify server
      await callServiceRef.current.notifyCallEnded(requestId, 'owner_ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, []);

  const handleStateChange = useCallback(async (newState: CallState) => {
    switch (newState.type) {
      case 'requesting_token':
        await handleRequestingToken(newState.requestId);
        break;
      
      case 'token_received':
        await handleTokenReceived(newState.token);
        break;
      
      case 'ending':
        await handleCallEnding(newState.session.requestId);
        break;
      
      case 'ended':
        onCallEndedRef.current?.(newState.session.requestId, newState.reason);
        break;
      
      case 'error':
        onErrorRef.current?.(newState.error);
        break;
    }
  }, [handleRequestingToken, handleTokenReceived, handleCallEnding]);

  // Initialize services - only once
  useEffect(() => {
    if (!stateMachineRef.current) {
      stateMachineRef.current = new CallStateMachine();
    }
    
    if (!callServiceRef.current) {
      callServiceRef.current = new CallService();
    }
    
    if (!agoraManagerRef.current) {
      agoraManagerRef.current = AgoraManager.getInstance();
    }

    // Subscribe to state machine - only once
    const unsubscribe = stateMachineRef.current.subscribe((newState) => {
      setState(newState);
      // Don't call handleStateChange here to avoid infinite loop
    });

    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  // Separate effect for state changes
  useEffect(() => {
    handleStateChange(state);
  }, [state, handleStateChange]);

  // Separate effect for auto-initialization
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initializeAgora();
    }
  }, [autoInitialize, isInitialized, initializeAgora]);

  // Update media state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (agoraManagerRef.current) {
        setMediaState(agoraManagerRef.current.getMediaState());
        setConnectionInfo(agoraManagerRef.current.getConnectionInfo());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Actions
  const startCall = useCallback(async (requestId: string) => {
    if (!isInitialized) {
      await initializeAgora();
    }
    
    stateMachineRef.current?.dispatch({ type: 'OWNER_START_CALL', requestId });
  }, [isInitialized, initializeAgora]);

  const endCall = useCallback(async () => {
    stateMachineRef.current?.dispatch({ type: 'CALL_ENDED', reason: 'owner_ended' });
  }, []);

  const toggleLocalVideo = useCallback(async () => {
    if (!agoraManagerRef.current) {
      return;
    }

    try {
      const currentState = agoraManagerRef.current.getMediaState();
      await agoraManagerRef.current.enableLocalVideo(!currentState.localVideoEnabled);
    } catch (error) {
      console.error('Error toggling local video:', error);
    }
  }, []);

  const toggleLocalAudio = useCallback(async () => {
    if (!agoraManagerRef.current) {
      return;
    }

    try {
      const currentState = agoraManagerRef.current.getMediaState();
      await agoraManagerRef.current.enableLocalAudio(!currentState.localAudioEnabled);
    } catch (error) {
      console.error('Error toggling local audio:', error);
    }
  }, []);

  const muteRemoteVideo = useCallback(async (uid: number, muted: boolean) => {
    if (!agoraManagerRef.current) {
      return;
    }

    try {
      await agoraManagerRef.current.muteRemoteVideo(uid, muted);
    } catch (error) {
      console.error('Error muting remote video:', error);
    }
  }, []);

  const muteRemoteAudio = useCallback(async (uid: number, muted: boolean) => {
    if (!agoraManagerRef.current) {
      return;
    }

    try {
      await agoraManagerRef.current.muteRemoteAudio(uid, muted);
    } catch (error) {
      console.error('Error muting remote audio:', error);
    }
  }, []);

  const reset = useCallback(() => {
    stateMachineRef.current?.reset();
  }, []);

  const managerState: CallManagerState = {
    state,
    isInitialized,
    mediaState,
    connectionInfo,
  };

  const actions: CallManagerActions = {
    startCall,
    endCall,
    toggleLocalVideo,
    toggleLocalAudio,
    muteRemoteVideo,
    muteRemoteAudio,
    reset,
  };

  return [managerState, actions];
}