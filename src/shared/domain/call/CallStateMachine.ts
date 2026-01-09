/**
 * Production-Grade Call State Machine
 * Deterministic, race-condition safe, fault-tolerant
 */

import { CallState, CallEvent, CallSession, CallParticipant } from './types';

export class CallStateMachine {
  private state: CallState = { type: 'idle' };
  private listeners: Array<(state: CallState) => void> = [];

  constructor() {
    this.validateInvariants();
  }

  public getState(): CallState {
    return this.state;
  }

  public subscribe(listener: (state: CallState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public dispatch(event: CallEvent): void {
    const previousState = this.state;
    
    try {
      this.state = this.transition(this.state, event);
      this.validateInvariants();
      this.notifyListeners();
    } catch (error) {
      // State machine corruption - critical error
      console.error('State machine transition failed:', error);
      this.state = {
        type: 'error',
        error: {
          code: 'STATE_MACHINE_ERROR',
          message: error && typeof error === 'object' && 'message' in error 
            ? (error as Error).message 
            : 'Unknown state machine error',
          recoverable: false,
          timestamp: Date.now()
        },
        previousState
      };
      this.notifyListeners();
    }
  }

  private transition(state: CallState, event: CallEvent): CallState {
    switch (state.type) {
      case 'idle':
        return this.handleIdleState(state, event);
      
      case 'requesting_token':
        return this.handleRequestingTokenState(state, event);
      
      case 'token_received':
        return this.handleTokenReceivedState(state, event);
      
      case 'joining':
        return this.handleJoiningState(state, event);
      
      case 'active':
        return this.handleActiveState(state, event);
      
      case 'ending':
        return this.handleEndingState(state, event);
      
      case 'ended':
        return this.handleEndedState(state, event);
      
      case 'error':
        return this.handleErrorState(state, event);
      
      default:
        throw new Error(`Unknown state type: ${(state as any).type}`);
    }
  }

  private handleIdleState(state: CallState, event: CallEvent): CallState {
    switch (event.type) {
      case 'OWNER_START_CALL':
        return {
          type: 'requesting_token',
          requestId: event.requestId
        };
      
      default:
        return state; // Ignore invalid events in idle state
    }
  }

  private handleRequestingTokenState(state: CallState, event: CallEvent): CallState {
    switch (event.type) {
      case 'TOKEN_RECEIVED':
        const session: CallSession = {
          id: `call_${Date.now()}`,
          requestId: state.requestId,
          channelName: event.token.channelName,
          ownerId: 'owner', // TODO: Get from context
          guestId: 'guest', // TODO: Get from request
          status: 'pending',
          createdAt: Date.now(),
          participants: []
        };
        
        return {
          type: 'token_received',
          token: event.token,
          session
        };
      
      case 'ERROR':
        return {
          type: 'error',
          error: event.error,
          previousState: state
        };
      
      default:
        return state;
    }
  }

  private handleTokenReceivedState(state: CallState, event: CallEvent): CallState {
    switch (event.type) {
      case 'OWNER_JOINED':
        const ownerParticipant: CallParticipant = {
          uid: event.uid,
          role: 'owner',
          joinedAt: Date.now(),
          isConnected: true
        };
        
        const updatedSession: CallSession = {
          ...state.session,
          status: 'active',
          startedAt: Date.now(),
          participants: [ownerParticipant]
        };
        
        return {
          type: 'active',
          session: updatedSession,
          participants: [ownerParticipant]
        };
      
      case 'ERROR':
        return {
          type: 'error',
          error: event.error,
          previousState: state
        };
      
      default:
        return state;
    }
  }

  private handleJoiningState(state: CallState, event: CallEvent): CallState {
    switch (event.type) {
      case 'GUEST_JOINED':
        const guestParticipant: CallParticipant = {
          uid: event.uid,
          role: 'guest',
          joinedAt: Date.now(),
          isConnected: true
        };
        
        const participants = [...state.session.participants, guestParticipant];
        const updatedSession: CallSession = {
          ...state.session,
          participants
        };
        
        return {
          type: 'active',
          session: updatedSession,
          participants
        };
      
      case 'ERROR':
        return {
          type: 'error',
          error: event.error,
          previousState: state
        };
      
      default:
        return state;
    }
  }

  private handleActiveState(state: CallState & { type: 'active' }, event: CallEvent): CallState {
    switch (event.type) {
      case 'GUEST_JOINED':
        // Prevent duplicate joins
        const existingGuest = state.participants.find(p => p.role === 'guest');
        if (existingGuest) {
          return state; // Ignore duplicate join
        }
        
        const guestParticipant: CallParticipant = {
          uid: event.uid,
          role: 'guest',
          joinedAt: Date.now(),
          isConnected: true
        };
        
        const participants = [...state.participants, guestParticipant];
        const updatedSession: CallSession = {
          ...state.session,
          participants
        };
        
        return {
          type: 'active',
          session: updatedSession,
          participants
        };
      
      case 'PARTICIPANT_LEFT':
        const remainingParticipants = state.participants.filter(p => p.uid !== event.uid);
        const leftParticipant = state.participants.find(p => p.uid === event.uid);
        
        // If owner left, end call immediately
        if (leftParticipant?.role === 'owner') {
          return {
            type: 'ending',
            session: {
              ...state.session,
              status: 'ended',
              endedAt: Date.now(),
              participants: remainingParticipants
            }
          };
        }
        
        return {
          type: 'active',
          session: {
            ...state.session,
            participants: remainingParticipants
          },
          participants: remainingParticipants
        };
      
      case 'CALL_ENDED':
        return {
          type: 'ending',
          session: {
            ...state.session,
            status: 'ended',
            endedAt: Date.now()
          }
        };
      
      case 'ERROR':
        return {
          type: 'error',
          error: event.error,
          previousState: state
        };
      
      default:
        return state;
    }
  }

  private handleEndingState(state: CallState & { type: 'ending' }, event: CallEvent): CallState {
    // Transition to ended after cleanup
    return {
      type: 'ended',
      session: state.session,
      reason: 'owner_ended'
    };
  }

  private handleEndedState(state: CallState & { type: 'ended' }, event: CallEvent): CallState {
    switch (event.type) {
      case 'OWNER_START_CALL':
        // Allow new call to start
        return {
          type: 'requesting_token',
          requestId: event.requestId
        };
      
      default:
        return state; // Stay in ended state
    }
  }

  private handleErrorState(state: CallState & { type: 'error' }, event: CallEvent): CallState {
    switch (event.type) {
      case 'OWNER_START_CALL':
        // Allow recovery by starting new call
        return {
          type: 'requesting_token',
          requestId: event.requestId
        };
      
      default:
        return state; // Stay in error state
    }
  }

  private validateInvariants(): void {
    // Critical invariants that must never be violated
    switch (this.state.type) {
      case 'active':
        // Must have at least owner participant
        const hasOwner = this.state.participants.some(p => p.role === 'owner');
        if (!hasOwner) {
          throw new Error('Active call must have owner participant');
        }
        
        // Cannot have more than 2 participants (owner + guest)
        if (this.state.participants.length > 2) {
          throw new Error('Call cannot have more than 2 participants');
        }
        
        // Cannot have duplicate roles
        const roles = this.state.participants.map((p: CallParticipant) => p.role);
        const uniqueRoles = new Set(roles);
        if (roles.length !== uniqueRoles.size) {
          throw new Error('Cannot have duplicate participant roles');
        }
        break;
      
      case 'token_received':
        if (!this.state.token.token || !this.state.token.channelName) {
          throw new Error('Token must have valid token and channel name');
        }
        
        if (this.state.token.expiresAt <= Date.now()) {
          throw new Error('Token must not be expired');
        }
        break;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  public reset(): void {
    this.state = { type: 'idle' };
    this.notifyListeners();
  }
}