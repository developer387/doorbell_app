import { type Guest, type SmartLock } from '@/types/Property';

export type GuestAccessState =
    | { type: 'idle' }
    | { type: 'loading' }
    | { type: 'verifying_pin' }
    | { type: 'invalid_pin'; message: string }
    | { type: 'access_not_yet_active'; guest: Guest }
    | { type: 'access_expired'; guest: Guest }
    | { type: 'pin_verified'; guest: Guest | null; isMaster: boolean }
    | { type: 'locks_loaded'; guest: Guest | null; locks: SmartLock[]; isMaster: boolean }
    | { type: 'no_assigned_locks'; guest: Guest }
    | { type: 'no_locks_available' }
    | { type: 'system_error'; message: string; code?: string };

export type GuestAccessAction =
    | { type: 'START_PIN_VERIFICATION' }
    | { type: 'PIN_VERIFICATION_SUCCESS'; guest: Guest | null; isMaster: boolean }
    | { type: 'PIN_VERIFICATION_FAILED'; message: string }
    | { type: 'ACCESS_NOT_YET_ACTIVE'; guest: Guest }
    | { type: 'ACCESS_EXPIRED'; guest: Guest }
    | { type: 'LOCKS_RESOLVED'; locks: SmartLock[] }
    | { type: 'NO_ASSIGNED_LOCKS'; guest: Guest }
    | { type: 'NO_LOCKS_AVAILABLE' }
    | { type: 'SYSTEM_ERROR'; message: string; code?: string }
    | { type: 'RESET' };

export function guestAccessReducer(
    state: GuestAccessState,
    action: GuestAccessAction
): GuestAccessState {
    switch (action.type) {
        case 'START_PIN_VERIFICATION':
            return { type: 'verifying_pin' };

        case 'PIN_VERIFICATION_SUCCESS':
            return {
                type: 'pin_verified',
                guest: action.guest,
                isMaster: action.isMaster,
            };

        case 'PIN_VERIFICATION_FAILED':
            return { type: 'invalid_pin', message: action.message };

        case 'ACCESS_NOT_YET_ACTIVE':
            return { type: 'access_not_yet_active', guest: action.guest };

        case 'ACCESS_EXPIRED':
            return { type: 'access_expired', guest: action.guest };

        case 'LOCKS_RESOLVED':
            if (state.type === 'pin_verified') {
                return {
                    type: 'locks_loaded',
                    guest: state.guest,
                    locks: action.locks,
                    isMaster: state.isMaster,
                };
            }
            return state;

        case 'NO_ASSIGNED_LOCKS':
            return { type: 'no_assigned_locks', guest: action.guest };

        case 'NO_LOCKS_AVAILABLE':
            return { type: 'no_locks_available' };

        case 'SYSTEM_ERROR':
            return {
                type: 'system_error',
                message: action.message,
                code: action.code,
            };

        case 'RESET':
            return { type: 'idle' };

        default:
            return state;
    }
}

export const initialGuestAccessState: GuestAccessState = { type: 'idle' };
