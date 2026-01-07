import {
    doc,
    getDoc,
    onSnapshot,
    type DocumentSnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Guest, type SmartLock } from '@/types/Property';

export interface PropertyDTO {
    id: string;
    propertyName: string;
    address: string;
    pinCode?: string;
    smartLocks: SmartLock[];
    guests: Guest[];
    allowGuest: boolean;
}

export type FetchPropertyResult =
    | { status: 'success'; data: PropertyDTO }
    | { status: 'not_found' }
    | { status: 'error'; message: string; code?: string };

function normalizePropertyData(
    docId: string,
    data: Record<string, unknown>
): PropertyDTO {
    return {
        id: docId,
        propertyName: typeof data.propertyName === 'string' ? data.propertyName : 'Unknown Property',
        address: typeof data.address === 'string' ? data.address : '',
        pinCode: typeof data.pinCode === 'string' ? data.pinCode : undefined,
        smartLocks: Array.isArray(data.smartLocks) ? data.smartLocks : [],
        guests: Array.isArray(data.guests) ? data.guests : [],
        allowGuest: data.allowGuest === true,
    };
}

export async function fetchPropertyById(
    propertyId: string
): Promise<FetchPropertyResult> {
    if (!propertyId || propertyId.trim() === '') {
        return { status: 'error', message: 'Property ID is required', code: 'INVALID_INPUT' };
    }

    try {
        const propertyRef = doc(db, 'properties', propertyId.trim());
        const snapshot = await getDoc(propertyRef);

        if (!snapshot.exists()) {
            return { status: 'not_found' };
        }

        const data = snapshot.data();
        return {
            status: 'success',
            data: normalizePropertyData(snapshot.id, data as Record<string, unknown>),
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = (error as { code?: string })?.code;
        return { status: 'error', message: errorMessage, code: errorCode };
    }
}

export function subscribeToProperty(
    propertyId: string,
    onData: (result: FetchPropertyResult) => void
): Unsubscribe | null {
    if (!propertyId || propertyId.trim() === '') {
        onData({ status: 'error', message: 'Property ID is required', code: 'INVALID_INPUT' });
        return null;
    }

    try {
        const propertyRef = doc(db, 'properties', propertyId.trim());

        return onSnapshot(
            propertyRef,
            (snapshot: DocumentSnapshot) => {
                if (!snapshot.exists()) {
                    onData({ status: 'not_found' });
                    return;
                }

                const data = snapshot.data();
                onData({
                    status: 'success',
                    data: normalizePropertyData(snapshot.id, data as Record<string, unknown>),
                });
            },
            (error) => {
                const errorMessage = error instanceof Error ? error.message : 'Subscription failed';
                const errorCode = (error as { code?: string })?.code;
                onData({ status: 'error', message: errorMessage, code: errorCode });
            }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
        onData({ status: 'error', message: errorMessage, code: 'SUBSCRIPTION_FAILED' });
        return null;
    }
}
