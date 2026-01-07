import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import {
    guestAccessReducer,
    initialGuestAccessState,
    resolveGuestAccess,
    resolveAllowedLocks,
    resolveMasterLocks,
    type GuestAccessState,
} from '@/domain/guest';
import { fetchPropertyById, subscribeToProperty, type PropertyDTO } from '@/data/property';

interface UseGuestAccessOptions {
    propertyId: string;
    enableRealtime?: boolean;
}

interface UseGuestAccessReturn {
    state: GuestAccessState;
    propertyData: PropertyDTO | null;
    isLoading: boolean;
    verifyPin: (pin: string) => Promise<void>;
    confirmLockAccess: () => void;
    reset: () => void;
}

export function useGuestAccess({
    propertyId,
    enableRealtime = true,
}: UseGuestAccessOptions): UseGuestAccessReturn {
    const [state, dispatch] = useReducer(guestAccessReducer, initialGuestAccessState);
    const [propertyData, setPropertyData] = useState<PropertyDTO | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!propertyId) {
            setIsLoading(false);
            if (mountedRef.current) {
                dispatch({
                    type: 'SYSTEM_ERROR',
                    message: 'Property ID is required',
                    code: 'MISSING_PROPERTY_ID',
                });
            }
            return;
        }

        setIsLoading(true);

        const unsubscribe = enableRealtime
            ? subscribeToProperty(propertyId, (result) => {
                if (!mountedRef.current) return;

                setIsLoading(false);

                if (result.status === 'success') {
                    setPropertyData(result.data);
                } else if (result.status === 'not_found') {
                    dispatch({
                        type: 'SYSTEM_ERROR',
                        message: 'Property not found',
                        code: 'PROPERTY_NOT_FOUND',
                    });
                } else {
                    dispatch({
                        type: 'SYSTEM_ERROR',
                        message: result.message,
                        code: result.code,
                    });
                }
            })
            : null;

        if (!enableRealtime) {
            (async () => {
                const result = await fetchPropertyById(propertyId);
                if (!mountedRef.current) return;

                setIsLoading(false);

                if (result.status === 'success') {
                    setPropertyData(result.data);
                } else if (result.status === 'not_found') {
                    dispatch({
                        type: 'SYSTEM_ERROR',
                        message: 'Property not found',
                        code: 'PROPERTY_NOT_FOUND',
                    });
                } else {
                    dispatch({
                        type: 'SYSTEM_ERROR',
                        message: result.message,
                        code: result.code,
                    });
                }
            })();
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [propertyId, enableRealtime]);

    const verifyPin = useCallback(
        async (pin: string) => {
            if (!mountedRef.current) return;

            dispatch({ type: 'START_PIN_VERIFICATION' });

            try {
                const fetchResult = await fetchPropertyById(propertyId);

                if (!mountedRef.current) return;

                if (fetchResult.status === 'not_found') {
                    dispatch({
                        type: 'SYSTEM_ERROR',
                        message: 'Property not found',
                        code: 'PROPERTY_NOT_FOUND',
                    });
                    return;
                }

                if (fetchResult.status === 'error') {
                    dispatch({
                        type: 'SYSTEM_ERROR',
                        message: fetchResult.message,
                        code: fetchResult.code,
                    });
                    return;
                }

                const freshData = fetchResult.data;
                setPropertyData(freshData);

                const accessResult = resolveGuestAccess(pin, freshData.guests, freshData.pinCode);

                if (!mountedRef.current) return;

                switch (accessResult.status) {
                    case 'master_access':
                        dispatch({
                            type: 'PIN_VERIFICATION_SUCCESS',
                            guest: null,
                            isMaster: true,
                        });
                        break;

                    case 'valid':
                        dispatch({
                            type: 'PIN_VERIFICATION_SUCCESS',
                            guest: accessResult.guest,
                            isMaster: false,
                        });
                        break;

                    case 'not_yet_active':
                        dispatch({
                            type: 'ACCESS_NOT_YET_ACTIVE',
                            guest: accessResult.guest,
                        });
                        break;

                    case 'expired':
                        dispatch({ type: 'ACCESS_EXPIRED', guest: accessResult.guest });
                        break;

                    case 'invalid_pin':
                        dispatch({
                            type: 'PIN_VERIFICATION_FAILED',
                            message: 'PIN Incorrect, Try Again',
                        });
                        break;
                }
            } catch (error) {
                if (!mountedRef.current) return;

                const message = error instanceof Error ? error.message : 'Verification failed';
                dispatch({
                    type: 'SYSTEM_ERROR',
                    message,
                    code: 'VERIFICATION_ERROR',
                });
            }
        },
        [propertyId]
    );

    const confirmLockAccess = useCallback(() => {
        if (!mountedRef.current) return;
        if (state.type !== 'pin_verified') return;
        if (!propertyData) return;

        const { guest, isMaster } = state;

        if (isMaster) {
            const result = resolveMasterLocks(propertyData.smartLocks);

            if (result.status === 'locks_loaded') {
                dispatch({ type: 'LOCKS_RESOLVED', locks: result.locks });
            } else {
                dispatch({ type: 'NO_LOCKS_AVAILABLE' });
            }
        } else if (guest) {
            const result = resolveAllowedLocks(guest, propertyData.smartLocks);

            switch (result.status) {
                case 'locks_loaded':
                    dispatch({ type: 'LOCKS_RESOLVED', locks: result.locks });
                    break;
                case 'no_assigned_locks':
                    dispatch({ type: 'NO_ASSIGNED_LOCKS', guest });
                    break;
                case 'no_locks_available':
                    dispatch({ type: 'NO_LOCKS_AVAILABLE' });
                    break;
            }
        }
    }, [state, propertyData]);

    const reset = useCallback(() => {
        if (mountedRef.current) {
            dispatch({ type: 'RESET' });
        }
    }, []);

    return {
        state,
        propertyData,
        isLoading,
        verifyPin,
        confirmLockAccess,
        reset,
    };
}
