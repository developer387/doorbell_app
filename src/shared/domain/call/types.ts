/**
 * Production-Grade Video Call Domain Types
 * Zero-tolerance for race conditions or undefined states
 */

export interface CallConfig {
  readonly appId: number;
  readonly appSign: string; // Or token for production
  readonly callId: string;
  readonly userId: string;
  readonly userName: string;
}

export interface CallParticipant {
  readonly uid: string;
  readonly role: 'owner' | 'guest';
  readonly joinedAt: number;
  readonly isConnected: boolean;
}

export interface CallSession {
  readonly id: string;
  readonly requestId: string;
  readonly callId: string;
  readonly ownerId: string;
  readonly guestId: string;
  readonly status: CallStatus;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly endedAt?: number;
  readonly participants: ReadonlyArray<CallParticipant>;
}

export type CallStatus =
  | 'idle'
  | 'counting_down' // New state for the 5s countdown
  | 'waiting_for_owner' // Guest waiting
  | 'active'
  | 'ended'
  | 'failed';

export type CallEvent =
  | { type: 'START_COUNTDOWN' }
  | { type: 'COUNTDOWN_FINISHED' } // Trigger "send video" / ring
  | { type: 'OWNER_JOINED' }
  | { type: 'CALL_ENDED'; reason: 'owner_ended' | 'guest_ended' | 'error' | 'timeout' }
  | { type: 'ERROR'; error: CallError }
  | { type: 'CONFIG_RECEIVED'; config: CallConfig };

export interface CallError {
  readonly code: string;
  readonly message: string;
  readonly recoverable: boolean;
  readonly timestamp: number;
}

export interface CallPermissions {
  readonly camera: boolean;
  readonly microphone: boolean;
  readonly verified: boolean;
}

// State Machine States
export type CallState =
  | { type: 'idle' }
  | { type: 'counting_down'; remainingSeconds: number }
  | { type: 'waiting_for_owner'; callId: string } // "Send video" complete, waiting
  | { type: 'active'; config: CallConfig } // In call
  | { type: 'ended'; reason: string }
  | { type: 'error'; error: CallError };