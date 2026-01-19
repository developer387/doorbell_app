export interface GuestRequest {
    id: string;
    guestId: string;
    propertyId: string;        // Business identifier for display
    propertyDocId: string;     // Firestore document ID for collection path
    propertyName: string;
    videoUrl?: string;
    videoBlob?: string; // Base64 or blob URL for web
    timestamp: string;
    status: 'pending' | 'accepted' | 'declined';
    userId: string; // Property owner's user ID
    agoraChannelName?: string; // Channel name for video call
    
    // Optional fields for accepted requests
    allowedLocks?: string[];   // Device IDs for lock access
    channelId?: string;        // Agora channel for video calls
    callStarted?: boolean;     // Video call status
}
