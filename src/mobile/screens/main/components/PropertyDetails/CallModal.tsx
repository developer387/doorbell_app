import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import {
    RTCPeerConnection,
    RTCView,
    mediaDevices,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream
} from 'react-native-webrtc';
import { db } from '@/config/firebase';
import { doc, collection, onSnapshot, addDoc, setDoc } from 'firebase/firestore';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Camera } from 'expo-camera';

interface CallModalProps {
    visible: boolean;
    channelId: string; // This is the requestId
    propertyId: string;
    onClose: () => void;
}

export const CallModal = ({ visible, channelId, propertyId, onClose }: CallModalProps) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    const pc = useRef<RTCPeerConnection | null>(null);
    const signalingPath = `properties/${propertyId}/guestRequests/${channelId}/signaling`;

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ],
    };

    useEffect(() => {
        if (!visible) return;

        let isMounted = true;

        const startCall = async () => {
            try {
                // 0. Request Permissions
                const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
                const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();

                if (cameraStatus !== 'granted' || micStatus !== 'granted') {
                    console.log('⛔ Permissions not granted');
                    onClose();
                    return;
                }

                // 1. Get Local Stream
                const stream = await mediaDevices.getUserMedia({
                    audio: true,
                    video: {
                        facingMode: 'user',
                        width: 640,
                        height: 480,
                        frameRate: 30
                    }
                }) as MediaStream;

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                setLocalStream(stream);

                // 2. Create Peer Connection
                const peer = new RTCPeerConnection(configuration);
                pc.current = peer;

                // 3. Add tracks
                stream.getTracks().forEach(track => {
                    peer.addTrack(track, stream);
                });

                // 4. Handle Remote Stream
                (peer as any).ontrack = (event: any) => {
                    console.log('✅ Remote track received on mobile');
                    if (event.streams && event.streams[0]) {
                        setRemoteStream(event.streams[0]);
                    }
                };

                // 5. Handle ICE Candidates
                (peer as any).onicecandidate = async (event: any) => {
                    if (event.candidate) {
                        console.log('📤 Sending ICE Candidate from mobile');
                        const remoteIceCol = collection(db, signalingPath, 'remoteIceCandidates');
                        await addDoc(remoteIceCol, event.candidate.toJSON());
                    }
                };

                // 6. Signaling: Listen for Offer
                const unsubOffer = onSnapshot(doc(db, signalingPath, 'offer'), async (snapshot) => {
                    const data = snapshot.data();
                    if (data?.sdp && data?.type && !(peer as any).remoteDescription) {
                        console.log('📥 Received Offer on mobile');

                        await peer.setRemoteDescription(new RTCSessionDescription({
                            sdp: data.sdp as string,
                            type: data.type as any
                        }));

                        // Create Answer
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);

                        // Send Answer
                        await setDoc(doc(db, signalingPath, 'answer'), {
                            sdp: answer.sdp,
                            type: answer.type
                        });
                    }
                });

                // 7. Signaling: Listen for Guest ICE Candidates
                const iceCol = collection(db, signalingPath, 'iceCandidates', 'candidates');
                const unsubIce = onSnapshot(iceCol, (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            console.log('📥 Received Guest ICE Candidate on mobile');
                            if (pc.current) {
                                await pc.current.addIceCandidate(new RTCIceCandidate(data));
                            }
                        }
                    });
                });

                (peer as any).onconnectionstatechange = () => {
                    const state = (peer as any).connectionState;
                    console.log('🔗 Mobile Connection State:', state);
                    if (state === 'closed' || state === 'failed') {
                        handleEndCall();
                    }
                };

                return () => {
                    unsubOffer();
                    unsubIce();
                    stream.getTracks().forEach(t => t.stop());
                };

            } catch (error) {
                console.error('❌ Error starting WebRTC call on mobile:', error);
            }
        };

        startCall();

        return () => {
            isMounted = false;
        };
    }, [visible]);

    const handleEndCall = () => {
        localStream?.getTracks().forEach(track => track.stop());
        pc.current?.close();
        pc.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        onClose();
    };

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={handleEndCall}
        >
            <View style={styles.container}>
                {/* Remote Stream (Full Screen) */}
                <View style={styles.fullScreenVideo}>
                    {remoteStream ? (
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={styles.rtcView}
                            objectFit="cover"
                        />
                    ) : (
                        <View style={styles.waitingContainer}>
                            <Text style={styles.waitingText}>Connecting to guest...</Text>
                        </View>
                    )}
                </View>

                {/* Local Stream (PIP) */}
                <View style={styles.pipContainer}>
                    {localStream && isVideoEnabled && (
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.rtcView}
                            objectFit="cover"
                            zOrder={1}
                        />
                    )}
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                        {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, styles.endCallButton]}
                        onPress={handleEndCall}
                    >
                        <PhoneOff color="white" size={28} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                        {isVideoEnabled ? <Video color="white" size={24} /> : <VideoOff color="white" size={24} />}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullScreenVideo: {
        flex: 1,
    },
    rtcView: {
        flex: 1,
    },
    pipContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 120,
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30,
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCallButton: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: colors.error || '#ff4444',
    },
    waitingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waitingText: {
        color: 'white',
        fontSize: 16,
    }
});
