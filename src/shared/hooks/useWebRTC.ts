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

    const init = async () => {
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
            pc.current = new RTCPeerConnection(config);
            pc.current.ontrack = (event: RTCTrackEvent) => {
                setRemoteStream(event.streams[0]);
            };
        } else {
            pc.current = new RTCPeerConnectionNative(config);
            pc.current.onaddstream = (event: any) => {
                setRemoteStream(event.stream);
            };
        }
    };

    const addLocalTracks = async () => {
        const constraints = { video: true, audio: true };
        let stream;

        try {
            if (Platform.OS === 'web') {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));
            } else {
                stream = await mediaDevicesNative.getUserMedia(constraints);
                pc.current?.addStream(stream);
            }
            setLocalStream(stream);
        } catch (err) {
            console.error('Error adding local tracks:', err);
        }
    };

    const close = () => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
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
        createSessionDescription
    };
};
