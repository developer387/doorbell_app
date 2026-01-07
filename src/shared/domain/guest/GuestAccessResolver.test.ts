import { resolveGuestAccess, resolveAllowedLocks } from './GuestAccessResolver';
import { type Guest, type SmartLock } from '../../types/Property';

// --- Mocks ---
const MOCK_LOCK_1: SmartLock = {
    device_id: 'lock_123',
    display_name: 'Front Door',
    manufacturer: 'august',
    device_type: 'lock',
    connected_account_id: 'acc_1'
};

const MOCK_LOCK_2: SmartLock = {
    device_id: 'lock_456',
    display_name: 'Back Door',
    manufacturer: 'yale',
    device_type: 'lock',
    connected_account_id: 'acc_1'
};

const VALID_GUEST: Guest = {
    id: 'g1',
    name: 'John Doe',
    accessPin: '1234',
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    endTime: new Date(Date.now() + 3600000).toISOString(),   // 1 hour from now
    allowedLocks: ['lock_123'],
    avatar: 'avatar1',
    createdAt: new Date().toISOString()
};

const FUTURE_GUEST: Guest = {
    ...VALID_GUEST,
    id: 'g2',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 90000000).toISOString()
};

const EXPIRED_GUEST: Guest = {
    ...VALID_GUEST,
    id: 'g3',
    startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    endTime: new Date(Date.now() - 3600000).toISOString()     // 1 hour ago
};

// --- Tests ---

describe('GuestAccessResolver', () => {

    // 1. PIN Validation Matrix
    describe('resolveGuestAccess (PIN Validation)', () => {

        test('should return valid status for correct PIN within active time', () => {
            const result = resolveGuestAccess('1234', [VALID_GUEST]);
            expect(result.status).toBe('valid');
            if (result.status === 'valid') {
                expect(result.guest.id).toBe('g1');
            }
        });

        test('should fail for incorrect PIN', () => {
            const result = resolveGuestAccess('0000', [VALID_GUEST]);
            expect(result.status).toBe('invalid_pin');
        });

        test('should fail for partial PIN', () => {
            const result = resolveGuestAccess('123', [VALID_GUEST]);
            expect(result.status).toBe('invalid_pin');
        });

        test('should handle master PIN correctly', () => {
            const result = resolveGuestAccess('9999', [VALID_GUEST], '9999');
            expect(result.status).toBe('master_access');
        });

        test('should NOT allow master PIN if not provided (undefined)', () => {
            const result = resolveGuestAccess('9999', [VALID_GUEST], undefined);
            expect(result.status).toBe('invalid_pin');
        });

        test('should not handle PIN with whitespace', () => {
            const result = resolveGuestAccess(' 1234 ', [VALID_GUEST]);
            expect(result.status).toBe('invalid_pin');
        });
    });

    // 2. Time Logic Matrix
    describe('resolveGuestAccess (Time Logic)', () => {

        test('should return not_yet_active for future start time', () => {
            const result = resolveGuestAccess('1234', [FUTURE_GUEST]);
            expect(result.status).toBe('not_yet_active');
        });

        test('should return expired for past end time', () => {
            const result = resolveGuestAccess('1234', [EXPIRED_GUEST]);
            expect(result.status).toBe('expired');
        });

        test('should allow access within small buffer window (e.g. 1 min before start)', () => {
            // Mock a guest starting 30 seconds from now
            const NEAR_FUTURE_GUEST = {
                ...VALID_GUEST,
                startTime: new Date(Date.now() + 30000).toISOString()
            };
            const result = resolveGuestAccess('1234', [NEAR_FUTURE_GUEST]);
            expect(result.status).toBe('valid');
        });
    });

    // 3. Lock Resolution Matrix
    describe('resolveAllowedLocks', () => {

        test('should return locks_loaded with filtered list for valid guest', () => {
            const result = resolveAllowedLocks(VALID_GUEST, [MOCK_LOCK_1, MOCK_LOCK_2]);
            expect(result.status).toBe('locks_loaded');
            if (result.status === 'locks_loaded') {
                expect(result.locks).toHaveLength(1);
                expect(result.locks[0].device_id).toBe('lock_123');
            }
        });

        test('should return no_assigned_locks if guest has empty allowedLocks array', () => {
            const guestNoLocks = { ...VALID_GUEST, allowedLocks: [] };
            const result = resolveAllowedLocks(guestNoLocks, [MOCK_LOCK_1]);
            expect(result.status).toBe('no_assigned_locks');
        });

        test('should return no_locks_available if smartLocks list is empty', () => {
            const result = resolveAllowedLocks(VALID_GUEST, []);
            expect(result.status).toBe('no_locks_available');
        });

        test('should return no_assigned_locks if IDs do not match any available locks', () => {
            const guestWrongLock = { ...VALID_GUEST, allowedLocks: ['lock_999'] };
            const result = resolveAllowedLocks(guestWrongLock, [MOCK_LOCK_1]);
            expect(result.status).toBe('no_assigned_locks');
        });

        test('should handle case insensitivity in lock IDs', () => {
            // Guest has 'LOCK_123', system has 'lock_123'
            const guestCaps = { ...VALID_GUEST, allowedLocks: ['LOCK_123'] };
            const result = resolveAllowedLocks(guestCaps, [MOCK_LOCK_1]);
            expect(result.status).toBe('locks_loaded');
            if (result.status === 'locks_loaded') {
                expect(result.locks[0].device_id).toBe('lock_123');
            }
        });

        test('should handle whitespace in lock IDs', () => {
            // Guest has ' lock_123 ', system has 'lock_123'
            const guestSpace = { ...VALID_GUEST, allowedLocks: [' lock_123 '] };
            const result = resolveAllowedLocks(guestSpace, [MOCK_LOCK_1]);
            expect(result.status).toBe('locks_loaded');
        });

        test('should ignore null/undefined locks in the list safely', () => {
            // @ts-ignore - simulating bad data from API
            const result = resolveAllowedLocks(VALID_GUEST, [MOCK_LOCK_1, null, undefined]);
            expect(result.status).toBe('locks_loaded');
            if (result.status === 'locks_loaded') {
                expect(result.locks).toHaveLength(1);
            }
        });
    });
});
