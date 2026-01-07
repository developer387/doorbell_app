import { type Guest, type SmartLock } from '@/types/Property';

export type GuestAccessResult =
    | { status: 'valid'; guest: Guest }
    | { status: 'invalid_pin' }
    | { status: 'not_yet_active'; guest: Guest }
    | { status: 'expired'; guest: Guest }
    | { status: 'master_access' };

export type LockAuthorizationResult =
    | { status: 'locks_loaded'; locks: SmartLock[] }
    | { status: 'no_assigned_locks' }
    | { status: 'no_locks_available' };

const normalizeId = (id: string | undefined | null): string => {
    if (id === undefined || id === null) {
        return '';
    }
    return id.trim().toLowerCase();
};

export function resolveGuestAccess(
    pin: string,
    guests: Guest[],
    masterPin?: string
): GuestAccessResult {
    if (!pin || pin.length !== 4) {
        return { status: 'invalid_pin' };
    }

    const trimmedPin = pin.trim();

    if (masterPin && masterPin.trim() === trimmedPin) {
        return { status: 'master_access' };
    }

    const safeGuests = Array.isArray(guests) ? guests : [];
    const matchingGuest = safeGuests.find(
        (g) => g?.accessPin?.trim() === trimmedPin
    );

    if (!matchingGuest) {
        return { status: 'invalid_pin' };
    }

    const now = Date.now();
    const bufferMs = 60 * 1000;

    const startTime = new Date(matchingGuest.startTime).getTime();
    const endTime = new Date(matchingGuest.endTime).getTime();

    if (isNaN(startTime) || isNaN(endTime)) {
        return { status: 'valid', guest: matchingGuest };
    }

    if (now < startTime - bufferMs) {
        return { status: 'not_yet_active', guest: matchingGuest };
    }

    if (now > endTime + bufferMs) {
        return { status: 'expired', guest: matchingGuest };
    }

    return { status: 'valid', guest: matchingGuest };
}

export function resolveAllowedLocks(
    guest: Guest | null,
    smartLocks: SmartLock[]
): LockAuthorizationResult {
    const safeLocks = Array.isArray(smartLocks) ? smartLocks : [];

    if (safeLocks.length === 0) {
        return { status: 'no_locks_available' };
    }

    if (guest === null) {
        return { status: 'locks_loaded', locks: safeLocks };
    }

    const allowedIds = Array.isArray(guest.allowedLocks) ? guest.allowedLocks : [];

    if (allowedIds.length === 0) {
        return { status: 'no_assigned_locks' };
    }

    const normalizedAllowedIds = new Set(allowedIds.map(normalizeId));

    const authorizedLocks = safeLocks.filter((lock) => {
        const lockId = normalizeId(lock?.device_id);
        return lockId !== '' && normalizedAllowedIds.has(lockId);
    });

    if (authorizedLocks.length === 0) {
        return { status: 'no_assigned_locks' };
    }

    return { status: 'locks_loaded', locks: authorizedLocks };
}

export function resolveMasterLocks(
    smartLocks: SmartLock[]
): LockAuthorizationResult {
    const safeLocks = Array.isArray(smartLocks) ? smartLocks : [];

    if (safeLocks.length === 0) {
        return { status: 'no_locks_available' };
    }

    return { status: 'locks_loaded', locks: safeLocks };
}
