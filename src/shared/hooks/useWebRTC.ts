import { useRef, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// WebRTC types for native platform
type RTCPeerConnectionType = RTCPeerConnection;
type MediaStreamType = MediaStream;


let RTCPeerConnectionNative: any;
let mediaDevicesNative: any;
let RTCIceCandidateNative: any;
let RTCSessionDescriptionNative: any;

if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const WebRTC = require('react-native-webrtc');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    RTCPeerConnectionNative = WebRTC.RTCPeerConnection;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    mediaDevicesNative = WebRTC.mediaDevices;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    RTCIceCandidateNative = WebRTC.RTCIceCandidate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    RTCSessionDescriptionNative = WebRTC.RTCSessionDescription;
}

export const useWebRTC = (_isMobile: boolean) => {
    const pc = useRef<RTCPeerConnectionType | null>(null);
    const [localStream, setLocalStream] = useState<MediaStreamType | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStreamType | null>(null);
    const [connectionState, setConnectionState] = useState<string>('new');
    const [isMuted, setIsMuted] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const processedCandidates = useRef<Set<string>>(new Set());

    // ICE candidate handling - buffer candidates until handler is ready
    const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
    const iceCandidateHandler = useRef<((candidate: RTCIceCandidateInit) => void) | null>(null);

    // Set the ICE candidate handler - call this BEFORE init() to capture all candidates
    const setOnIceCandidate = useCallback((handler: (candidate: RTCIceCandidateInit) => void) => {
        iceCandidateHandler.current = handler;
        // Flush any buffered candidates
        if (iceCandidateBuffer.current.length > 0) {
            console.log(`[WebRTC] Flushing ${iceCandidateBuffer.current.length} buffered ICE candidates`);
            iceCandidateBuffer.current.forEach((candidate) => handler(candidate));
            iceCandidateBuffer.current = [];
        }
    }, []);

    const init = () => {
        try {
            // Environment variables for TURN server configuration
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const turnUser: string | undefined = process.env.EXPO_PUBLIC_TURN_USER;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const turnPass: string | undefined = process.env.EXPO_PUBLIC_TURN_PASS;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const turnUrl: string = process.env.EXPO_PUBLIC_TURN_URL ?? 'turn:global.relay.metered.ca:80';

            const config: RTCConfiguration = {
                iceServers: [
                    // Google's public STUN servers (reliable fallback)
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    // Metered.ca STUN server
                    { urls: 'stun:stun.relay.metered.ca:80' },
                    // Metered.ca TURN servers (required for cross-network connectivity)
                    {
                        urls: turnUrl,
                        username: turnUser,
                        credential: turnPass,
                    },
                    {
                        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                        username: turnUser,
                        credential: turnPass,
                    },
                    {
                        urls: 'turn:global.relay.metered.ca:443',
                        username: turnUser,
                        credential: turnPass,
                    },
                    {
                        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                        username: turnUser,
                        credential: turnPass,
                    },
                ],
            };

            let peerConnection: RTCPeerConnectionType;
            if (Platform.OS === 'web') {
                peerConnection = new RTCPeerConnection(config);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
                peerConnection = new RTCPeerConnectionNative(config);
            }
            pc.current = peerConnection;

            // Use ontrack for both web and native (modern API)
            peerConnection.ontrack = (event: RTCTrackEvent) => {
                if (event.streams?.[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            // Add connection state monitoring
            peerConnection.onconnectionstatechange = () => {
                const state = pc.current?.connectionState ?? 'new';
                setConnectionState(state);
            };

            peerConnection.oniceconnectionstatechange = () => {
                const state = pc.current?.iceConnectionState;
                console.log('[WebRTC] ICE connection state:', state);
            };

            peerConnection.onicegatheringstatechange = () => {
                const state = pc.current?.iceGatheringState;
                console.log('[WebRTC] ICE gathering state:', state);
            };

            // Set up ICE candidate handler - buffer candidates if handler not ready yet
            peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                if (event.candidate) {
                    const candidateInit = event.candidate.toJSON() as RTCIceCandidateInit;
                    console.log('[WebRTC] ICE candidate gathered:', candidateInit.candidate?.substring(0, 50));
                    if (iceCandidateHandler.current) {
                        iceCandidateHandler.current(candidateInit);
                    } else {
                        // Buffer the candidate until handler is set
                        console.log('[WebRTC] Buffering ICE candidate (handler not ready)');
                        iceCandidateBuffer.current.push(candidateInit);
                    }
                }
            };
        } catch (err) {
            console.error('[WebRTC] Error initializing peer connection:', err);
            throw err;
        }
    };

    const addLocalTracks = async () => {
        // High quality video constraints for better video quality
        const constraints: MediaStreamConstraints = {
            video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30, min: 15 },
                facingMode: 'user',
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        };
        let stream: MediaStreamType;

        try {
            if (Platform.OS === 'web') {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                stream = await mediaDevicesNative.getUserMedia(constraints);
            }

            stream.getTracks().forEach((track: MediaStreamTrack) => {
                pc.current?.addTrack(track, stream);
            });

            setLocalStream(stream);
        } catch (err) {
            console.error('[WebRTC] Error adding local tracks:', err);
            throw err;
        }
    };

    const close = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('new');
        setIsMuted(false);
        setIsFrontCamera(true);
        processedCandidates.current.clear();
        // Clear ICE candidate buffer and handler for next call
        iceCandidateBuffer.current = [];
        iceCandidateHandler.current = null;
    }, [localStream]);

    // Toggle audio mute/unmute
    const toggleMute = useCallback(() => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach((track: MediaStreamTrack) => {
                track.enabled = !track.enabled;
            });
            setIsMuted((prev) => !prev);
        }
    }, [localStream]);

    // Flip camera (front/back)
    const flipCamera = useCallback(async () => {
        if (!localStream || !pc.current) return;

        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        // Stop current video track
        videoTrack.stop();

        const newFacingMode = isFrontCamera ? 'environment' : 'user';
        const constraints: MediaStreamConstraints = {
            video: {
                facingMode: newFacingMode,
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30, min: 15 },
            },
            audio: false,
        };

        try {
            let newVideoStream: MediaStreamType;
            if (Platform.OS === 'web') {
                newVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                newVideoStream = await mediaDevicesNative.getUserMedia(constraints);
            }

            const newVideoTrack = newVideoStream.getVideoTracks()[0];

            // Replace track in peer connection
            const senders = pc.current.getSenders();
            const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video');
            if (videoSender) {
                await videoSender.replaceTrack(newVideoTrack);
            }

            if (Platform.OS === 'web') {
                // On web, create a new MediaStream to trigger re-render
                const audioTrack = localStream.getAudioTracks()[0];
                const updatedStream = new MediaStream();
                if (audioTrack) {
                    updatedStream.addTrack(audioTrack);
                }
                updatedStream.addTrack(newVideoTrack);
                setLocalStream(updatedStream);
            } else {
                // On native, the newVideoStream already contains the video
                // We need to preserve the audio track from the original stream
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                    newVideoStream.addTrack(audioTrack);
                }
                setLocalStream(newVideoStream);
            }

            setIsFrontCamera((prev) => !prev);
        } catch (err) {
            console.error('[WebRTC] Error flipping camera:', err);
        }
    }, [localStream, isFrontCamera]);

    // Add remote ICE candidate with deduplication
    const addRemoteIceCandidate = useCallback(async (candidateData: RTCIceCandidateInit) => {
        if (!pc.current) {
            console.warn('[WebRTC] Cannot add ICE candidate: no peer connection');
            return false;
        }

        const candidateId = JSON.stringify(candidateData);
        if (processedCandidates.current.has(candidateId)) {
            return false;
        }

        try {
            const candidate = createIceCandidate(candidateData);
            await pc.current.addIceCandidate(candidate);
            processedCandidates.current.add(candidateId);
            return true;
        } catch (e) {
            console.warn('[WebRTC] Error adding ICE candidate:', e);
            return false;
        }
    }, []);

    // Helper to ensure we use the correct class for candidates/descriptions
    const createIceCandidate = (candidate: RTCIceCandidateInit): RTCIceCandidate => {
        if (Platform.OS === 'web') return new RTCIceCandidate(candidate);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        return new RTCIceCandidateNative(candidate);
    };

    const createSessionDescription = (desc: RTCSessionDescriptionInit): RTCSessionDescription => {
        if (Platform.OS === 'web') return new RTCSessionDescription(desc);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        return new RTCSessionDescriptionNative(desc);
    };

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (localStream) {
                localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
            if (pc.current) {
                pc.current.close();
                pc.current = null;
            }
        };
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
        addRemoteIceCandidate,
        // ICE candidate handling - set handler BEFORE init() to capture all candidates
        setOnIceCandidate,
        // Audio/Video controls
        isMuted,
        toggleMute,
        isFrontCamera,
        flipCamera,
    };
};
