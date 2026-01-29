export interface GuestRequest {
    id: string;
    guestId?: string;
    ownerId?: string; // Made optional to fit existing types if needed, but critical for new flow
    propertyId?: string; // Keep for compatibility
    propertyName?: string;
    videoUrl?: string; // Public URL of the 5‑sec clip
    status: 'pending' | 'viewed' | 'calling' | 'ended' | 'accepted' | 'declined' | 'missed' | 'timeout';
    createdAt?: any; // Firestore Timestamp

    // Signaling fields
    callOffer?: RTCSessionDescriptionInit;   // Owner → Guest
    callAnswer?: RTCSessionDescriptionInit;  // Guest → Owner
    iceCandidates?: IceCandidateRecord[];    // Shared array
}

/** Helper type for ICE candidate entries */
export interface IceCandidateRecord {
    from: 'owner' | 'guest';
    candidate: RTCIceCandidateInit;
}
