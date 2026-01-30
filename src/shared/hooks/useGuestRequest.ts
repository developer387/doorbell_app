// src/shared/hooks/useGuestRequest.ts
import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GuestRequest, IceCandidateRecord, SharedLock } from '../types/GuestRequest';

export const useGuestRequest = (requestId: string) => {
    const [request, setRequest] = useState<GuestRequest | null>(null);

    // Real‑time listener for the request document
    useEffect(() => {
        if (!requestId) return;
        const unsub = onSnapshot(doc(db, 'guestRequests', requestId), (snap) => {
            if (snap.exists()) setRequest({ ...(snap.data() as GuestRequest), id: snap.id });
        });
        return () => unsub();
    }, [requestId]);

    // Helper to change status
    const setStatus = useCallback(
        async (status: GuestRequest['status']) => {
            if (!requestId) return;
            await updateDoc(doc(db, 'guestRequests', requestId), { status });
        },
        [requestId]
    );

    // Write SDP offer (owner → guest)
    const setCallOffer = useCallback(
        async (offer: RTCSessionDescriptionInit) => {
            if (!requestId) return;
            await updateDoc(doc(db, 'guestRequests', requestId), {
                callOffer: offer,
                status: 'calling' as const,
            });
        },
        [requestId]
    );

    // Write SDP answer (guest → owner)
    const setCallAnswer = useCallback(
        async (answer: RTCSessionDescriptionInit) => {
            if (!requestId) return;
            await updateDoc(doc(db, 'guestRequests', requestId), { callAnswer: answer });
        },
        [requestId]
    );

    // Append ICE candidate
    const addIceCandidate = useCallback(
        async (candidate: RTCIceCandidateInit, from: 'owner' | 'guest') => {
            if (!requestId) return;
            const record: IceCandidateRecord = { from, candidate };
            await updateDoc(doc(db, 'guestRequests', requestId), {
                iceCandidates: arrayUnion(record),
            });
        },
        [requestId]
    );

    // Share locks with guest
    const shareLocks = useCallback(
        async (locks: SharedLock[]) => {
            if (!requestId) return;
            await updateDoc(doc(db, 'guestRequests', requestId), { sharedLocks: locks });
        },
        [requestId]
    );

    // Clear shared locks
    const clearSharedLocks = useCallback(
        async () => {
            if (!requestId) return;
            await updateDoc(doc(db, 'guestRequests', requestId), { sharedLocks: deleteField() });
        },
        [requestId]
    );

    return { request, setStatus, setCallOffer, setCallAnswer, addIceCandidate, shareLocks, clearSharedLocks };
};
