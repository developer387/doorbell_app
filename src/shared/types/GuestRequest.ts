export interface GuestRequest {
    id: string;
    guestId: string;
    propertyId: string;
    propertyName: string;
    videoUrl?: string; // URL of the recorded video
    videoBlob?: string; // Base64 or blob URL (for local preview/upload)
    thumbnailUrl?: string; // Optional thumbnail
    timestamp: string;
    userId: string; // Property owner's user ID

    // Status Flow
    status: 'pending' | 'viewed' | 'call_incoming' | 'call_active' | 'declined' | 'completed' | 'expired';

    // Explicit State Flags (as requested for strict integrity)
    videoWatched: boolean;       // Owner has watched the video at least once
    callInitiated: boolean;      // Owner has clicked "Call Guest" -> Transitions guest to "Join Call"
    requestDeclined: boolean;    // Owner has clicked "Decline"

    // Call Details
    agoraChannelName?: string;   // Deprecated, prefer channelId
    channelId?: string;          // Room ID for the call
    token?: string;              // Call token
}
