// src/shared/hooks/useOwnerRequests.ts
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GuestRequest, IceCandidateRecord } from '../types/GuestRequest';

export const useOwnerRequests = (propertyId: string) => {
    const [requests, setRequests] = useState<GuestRequest[]>([]);

    // Listen to all guest requests for this PROPERTY
    useEffect(() => {
        if (!propertyId) return;
        const q = query(collection(db, 'guestRequests'), where('propertyId', '==', propertyId));
        const unsub = onSnapshot(q, (snap) => {
            const list: GuestRequest[] = [];
            snap.forEach((docSnap) => {
                list.push({ ...(docSnap.data() as GuestRequest), id: docSnap.id });
            });
            // Sort by newest? Firestore query can do orderBy but requires index. Client sort is fine for now.
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setRequests(list);
        });
        return () => unsub();
    }, [propertyId]);

    // Helper to update status
    const setStatus = useCallback(async (requestId: string, status: GuestRequest['status']) => {
        await updateDoc(doc(db, 'guestRequests', requestId), { status });
    }, []);

    // Helper to write SDP offer (owner → guest)
    const setCallOffer = useCallback(async (requestId: string, offer: RTCSessionDescriptionInit) => {
        await updateDoc(doc(db, 'guestRequests', requestId), {
            callOffer: offer,
            status: 'calling' as const,
        });
    }, []);

    // Helper to add ICE candidate
    const addIceCandidate = useCallback(async (requestId: string, candidate: RTCIceCandidateInit) => {
        const record: IceCandidateRecord = { from: 'owner', candidate };
        await updateDoc(doc(db, 'guestRequests', requestId), {
            iceCandidates: arrayUnion(record),
        });
    }, []);

    // Helper to read remote answer
    const getAnswer = useCallback(async (_requestId: string) => {
        // Warning: This is a one-time fetch. Real-time is handled by the subscription above for 'requests' 
        // but 'callAnswer' is part of the doc.
        // Usually we check requests.find(r => r.id===id).callAnswer
        return null;
    }, []);

    // Helper to write SDP answer (owner answers guest)
    const setCallAnswer = useCallback(
        async (requestId: string, answer: RTCSessionDescriptionInit) => {
            await updateDoc(doc(db, 'guestRequests', requestId), { callAnswer: answer });
        },
        []
    );

    return { requests, setStatus, setCallOffer, addIceCandidate, getAnswer, setCallAnswer };
};
