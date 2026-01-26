// src/shared/hooks/useGuestRequest.ts
import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GuestRequest, IceCandidateRecord } from '../types/GuestRequest';

export const useGuestRequest = (requestId: string) => {
    const [request, setRequest] = useState<GuestRequest | null>(null);

    // Real‑time listener for the request document
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'guestRequests', requestId), (snap) => {
            if (snap.exists()) setRequest({ id: snap.id, ...(snap.data() as GuestRequest) });
        });
        return () => unsub();
    }, [requestId]);

    // Helper to change status
    const setStatus = useCallback(
        async (status: GuestRequest['status']) => {
            await updateDoc(doc(db, 'guestRequests', requestId), { status });
        },
        [requestId]
    );

    // Write SDP offer (owner → guest)
    const setCallOffer = useCallback(
        async (offer: RTCSessionDescriptionInit) => {
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
            await updateDoc(doc(db, 'guestRequests', requestId), { callAnswer: answer });
        },
        [requestId]
    );

    // Append ICE candidate
    const addIceCandidate = useCallback(
        async (candidate: RTCIceCandidateInit, from: 'owner' | 'guest') => {
            const record: IceCandidateRecord = { from, candidate };
            await updateDoc(doc(db, 'guestRequests', requestId), {
                iceCandidates: arrayUnion(record),
            });
        },
        [requestId]
    );

    return { request, setStatus, setCallOffer, setCallAnswer, addIceCandidate };
};
