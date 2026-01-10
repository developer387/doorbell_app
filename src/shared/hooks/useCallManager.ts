/**
 * Call Manager Hook
 * Simplified for ZegoCloud (UIKit handles media state)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CallService } from '../services/call/CallService';
import { CallState, CallError } from '../domain/call/types';

export interface UseCallManagerOptions {
  onCallStarted?: (requestId: string) => void;
  onCallEnded?: (requestId: string, reason: string) => void;
  onError?: (error: CallError) => void;
}

export function useCallManager(options: UseCallManagerOptions = {}) {
  const { onCallStarted, onCallEnded, onError } = options;

  const callServiceRef = useRef<CallService | null>(null);
  const [state, setState] = useState<CallState>({ type: 'idle' });

  // Initialize service
  useEffect(() => {
    callServiceRef.current = new CallService();
  }, []);

  const startCall = useCallback(async (requestId: string) => {
    // With Zego UIKit, 'start' usually just means mounting the component
    // We might want to notify the server here
    try {
      await callServiceRef.current?.notifyCallStarted(requestId);
      setState({ type: 'active', config: { appId: 0, appSign: '', callId: requestId, userId: 'owner', userName: 'Owner' } }); // Mock config
      onCallStarted?.(requestId);
    } catch (e: any) {
      console.error(e);
      onError?.({ code: 'START_FAILED', message: e.message, recoverable: true, timestamp: Date.now() });
    }
  }, [onCallStarted, onError]);

  const endCall = useCallback(async (requestId: string) => {
    try {
      await callServiceRef.current?.notifyCallEnded(requestId, 'owner_ended');
      setState({ type: 'ended', reason: 'owner_ended' });
      onCallEnded?.(requestId, 'owner_ended');
    } catch (e) {
      console.error(e);
    }
  }, [onCallEnded]);

  return {
    state,
    startCall,
    endCall
  };
}