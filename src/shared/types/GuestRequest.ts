export interface GuestRequest {
    id: string;
    guestId: string;
    propertyId: string;
    propertyName: string;
    videoUrl?: string;
    videoBlob?: string; // Base64 or blob URL for web
    timestamp: string;
    status: 'pending' | 'accepted' | 'declined';
    userId: string; // Property owner's user ID
    agoraChannelName?: string; // Channel name for video call
}
