import { useRef, useState, useEffect } from 'react';
import { Platform } from 'react-native';
// We need to conditionally require react-native-webrtc only on native
let RTCPeerConnectionNative: any;
let mediaDevicesNative: any;
let RTCIceCandidateNative: any;
let RTCSessionDescriptionNative: any;

if (Platform.OS !== 'web') {
    const WebRTC = require('react-native-webrtc');
    RTCPeerConnectionNative = WebRTC.RTCPeerConnection;
    mediaDevicesNative = WebRTC.mediaDevices;
    RTCIceCandidateNative = WebRTC.RTCIceCandidate;
    RTCSessionDescriptionNative = WebRTC.RTCSessionDescription;
}

export const useWebRTC = (isMobile: boolean) => {
    const pc = useRef<any | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<string>('new');
    const processedCandidates = useRef<Set<string>>(new Set());

    const init = async () => {
        try {
            console.log('[WebRTC] Initializing peer connection...');

            const config = {
                iceServers: [
                    { urls: 'stun:stun.relay.metered.ca:80' },
                    {
                        urls: process.env.EXPO_PUBLIC_TURN_URL || 'turn:global.relay.metered.ca:80',
                        username: process.env.EXPO_PUBLIC_TURN_USER,
                        credential: process.env.EXPO_PUBLIC_TURN_PASS,
                    },
                    {
                        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                        username: process.env.EXPO_PUBLIC_TURN_USER,
                        credential: process.env.EXPO_PUBLIC_TURN_PASS,
                    },
                    {
                        urls: 'turn:global.relay.metered.ca:443',
                        username: process.env.EXPO_PUBLIC_TURN_USER,
                        credential: process.env.EXPO_PUBLIC_TURN_PASS,
                    },
                    {
                        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                        username: process.env.EXPO_PUBLIC_TURN_USER,
                        credential: process.env.EXPO_PUBLIC_TURN_PASS,
                    },
                ],
            };

            if (Platform.OS === 'web') {
                console.log('[WebRTC] Creating RTCPeerConnection for web...');
                pc.current = new RTCPeerConnection(config);
            } else {
                console.log('[WebRTC] Creating RTCPeerConnection for native...');
                pc.current = new RTCPeerConnectionNative(config);
            }

            // Use ontrack for both web and native (modern API)
            pc.current.ontrack = (event: any) => {
                console.log('[WebRTC] Received remote track:', event.track?.kind);
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            // Add connection state monitoring
            pc.current.onconnectionstatechange = () => {
                const state = pc.current?.connectionState || 'new';
                console.log('[WebRTC] Connection state:', state);
                setConnectionState(state);
            };

            pc.current.oniceconnectionstatechange = () => {
                console.log('[WebRTC] ICE connection state:', pc.current?.iceConnectionState);
            };

            pc.current.onicegatheringstatechange = () => {
                console.log('[WebRTC] ICE gathering state:', pc.current?.iceGatheringState);
            };

            console.log('[WebRTC] Peer connection initialized successfully');
        } catch (err) {
            console.error('[WebRTC] Error initializing peer connection:', err);
            throw err;
        }
    };

    const addLocalTracks = async () => {
        const constraints = { video: true, audio: true };
        let stream;

        try {
            if (Platform.OS === 'web') {
                console.log('[WebRTC] Requesting getUserMedia on web...');
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } else {
                console.log('[WebRTC] Requesting getUserMedia on native...');
                stream = await mediaDevicesNative.getUserMedia(constraints);
            }

            console.log('[WebRTC] Got media stream, adding tracks...');
            stream.getTracks().forEach((track: any) => {
                console.log('[WebRTC] Adding track:', track.kind);
                pc.current?.addTrack(track, stream);
            });

            setLocalStream(stream);
            console.log('[WebRTC] Local stream set successfully');
        } catch (err) {
            console.error('[WebRTC] Error adding local tracks:', err);
            // Re-throw so caller can handle the error
            throw err;
        }
    };

    const close = () => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('new');
        processedCandidates.current.clear();
    };

    // Add remote ICE candidate with deduplication
    const addRemoteIceCandidate = async (candidateData: RTCIceCandidateInit) => {
        if (!pc.current) {
            console.warn('[WebRTC] Cannot add ICE candidate: no peer connection');
            return false;
        }

        const candidateId = JSON.stringify(candidateData);
        if (processedCandidates.current.has(candidateId)) {
            console.log('[WebRTC] Skipping duplicate ICE candidate');
            return false;
        }

        try {
            const candidate = createIceCandidate(candidateData);
            await pc.current.addIceCandidate(candidate);
            processedCandidates.current.add(candidateId);
            console.log('[WebRTC] Added ICE candidate successfully');
            return true;
        } catch (e) {
            console.warn('[WebRTC] Error adding ICE candidate:', e);
            return false;
        }
    };

    // Helper to ensure we use the correct class for candidates/descriptions
    const createIceCandidate = (candidate: any) => {
        if (Platform.OS === 'web') return new RTCIceCandidate(candidate);
        return new RTCIceCandidateNative(candidate);
    };

    const createSessionDescription = (desc: any) => {
        if (Platform.OS === 'web') return new RTCSessionDescription(desc);
        return new RTCSessionDescriptionNative(desc);
    };

    useEffect(() => {
        return () => {
            close();
        }
    }, []);

    return {
        pc,
        init,
        addLocalTracks,
        remoteStream,
        localStream,
        close,
        createIceCandidate,
        createSessionDescription,
        connectionState,
        addRemoteIceCandidate
    };
};
