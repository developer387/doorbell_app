export interface WebRTCSessionDescription {
    sdp: string | undefined;
    type: 'offer' | 'answer';
}

export interface WebRTCIceCandidate {
    candidate: string;
    sdpMid: string;
    sdpMLineIndex: number;
}

export interface CallSignalingData {
    offer?: WebRTCSessionDescription;
    answer?: WebRTCSessionDescription;
    status?: 'calling' | 'connected' | 'ended' | 'declined';
}
