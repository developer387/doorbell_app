/**
 * Production-Grade Video Call Domain Types
 * Zero-tolerance for race conditions or undefined states
 */

export interface AgoraToken {
  readonly token: string;
  readonly channelName: string;
  readonly uid: number;
  readonly expiresAt: number;
  readonly role: 'host' | 'audience';
}

export interface CallParticipant {
  readonly uid: number;
  readonly role: 'owner' | 'guest';
  readonly joinedAt: number;
  readonly isConnected: boolean;
}

export interface CallSession {
  readonly id: string;
  readonly requestId: string;
  readonly channelName: string;
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
  | 'pending'
  | 'active'
  | 'ended'
  | 'failed';

export type CallEvent = 
  | { type: 'OWNER_START_CALL'; requestId: string }
  | { type: 'TOKEN_RECEIVED'; token: AgoraToken }
  | { type: 'OWNER_JOINED'; uid: number }
  | { type: 'GUEST_JOINED'; uid: number }
  | { type: 'PARTICIPANT_LEFT'; uid: number }
  | { type: 'CALL_ENDED'; reason: 'owner_ended' | 'error' | 'timeout' }
  | { type: 'ERROR'; error: CallError };

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
  | { type: 'requesting_token'; requestId: string }
  | { type: 'token_received'; token: AgoraToken; session: CallSession }
  | { type: 'joining'; token: AgoraToken; session: CallSession }
  | { type: 'active'; session: CallSession; participants: ReadonlyArray<CallParticipant> }
  | { type: 'ending'; session: CallSession }
  | { type: 'ended'; session: CallSession; reason: string }
  | { type: 'error'; error: CallError; previousState?: CallState };