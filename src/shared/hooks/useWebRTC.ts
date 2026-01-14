import { useState, useRef, useEffect, useCallback } from 'react';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStreamType,
    RTCPeerConnectionType,
    MediaStream
} from '../utils/webrtc';
import { db } from '@/config/firebase';
import {
    doc,
    onSnapshot,
    collection,
    addDoc,
    updateDoc,
    getDoc,
    setDoc,
    DocumentReference,
    CollectionReference
} from 'firebase/firestore';

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export const useWebRTC = (propertyId: string, requestId: string) => {
    const [localStream, setLocalStream] = useState<MediaStreamType | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStreamType | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'>('new');

    const pc = useRef<RTCPeerConnectionType | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    // Call document reference
    const getCallDocRef = () => doc(db, 'properties', propertyId, 'guestRequests', requestId);
    const getOfferCandidatesCollection = () => collection(db, 'properties', propertyId, 'guestRequests', requestId, 'offerCandidates');
    const getAnswerCandidatesCollection = () => collection(db, 'properties', propertyId, 'guestRequests', requestId, 'answerCandidates');

    const setupLocalStream = async () => {
        try {
            const stream = await mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error("Error accessing media devices", error);
            return null;
        }
    };

    const cleanup = useCallback(() => {
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);
        setIsCallActive(false);
        setConnectionStatus('disconnected');
    }, [localStream]);

    const initializePeerConnection = useCallback((localStreamToAdd: MediaStreamType) => {
        // @ts-ignore - types might be slightly mismatched between web/native implementations
        const peerConnection = new RTCPeerConnection(servers);
        pc.current = peerConnection;

        // Add local tracks
        localStreamToAdd.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamToAdd);
        });

        // Handle remote stream
        peerConnection.ontrack = (event: any) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            } else {
                // Fallback for some implementations if stream not present in event (not common in modern webrtc)
                // But let's create a new stream and add track
                const newStream = new MediaStream();
                newStream.addTrack(event.track);
                setRemoteStream(newStream);
            }
        };

        peerConnection.onconnectionstatechange = () => {
            setConnectionStatus(peerConnection.connectionState);
        };

        return peerConnection;
    }, []);

    // Helper to add ICE candidate safely
    const addIceCandidateSafely = async (pc: RTCPeerConnectionType, candidate: any) => {
        try {
            if (pc.remoteDescription) {
                await pc.addIceCandidate(candidate);
            } else {
                // If remote description is not set, we technically should queue, 
                // but Firestore listeners might fire existing data immediately.
                // A simple approach in this unexpected case (since we usually subscribe after setting remote in 'join', 
                // but in 'start' we subscribe early).
                // For the 'Caller' (Guest), we subscribe to 'answerCandidates'. 
                // We receive them ONLY after the Callee answers.
                // So usually Callee has answered -> we get 'answer' doc update -> we set remote desc -> THEN we might get candidates.
                // BUT, if candidates arrive *before* the answer doc update triggers (unlikely in Firestore but possible due to snapshot race), 
                // or if we are the Callee (Owner) and we listen to offerCandidates immediately.
                // For Callee: We listen to offerCandidates. The Offer MUST exist for us to be here.
                // So we setRemoteDescription(offer) immediately.

                // Let's implement a simple queue just in case.
                // @ts-ignore
                if (!pc._candidateQueue) { pc._candidateQueue = []; }
                // @ts-ignore
                pc._candidateQueue.push(candidate);
            }
        } catch (error) {
            console.error("Error adding ice candidate", error);
        }
    };

    // Process queued candidates
    const processCandidateQueue = async (pc: RTCPeerConnectionType) => {
        // @ts-ignore
        if (pc._candidateQueue && pc._candidateQueue.length > 0) {
            // @ts-ignore
            for (const candidate of pc._candidateQueue) {
                try {
                    await pc.addIceCandidate(candidate);
                } catch (e) {
                    console.error("Error processing queued candidate", e);
                }
            }
            // @ts-ignore
            pc._candidateQueue = [];
        }
    };

    // Caller Side (Guest)
    const startCall = async () => {
        setIsCallActive(true);
        const stream = await setupLocalStream();
        if (!stream) {
            setConnectionStatus('failed');
            return;
        }

        const peerConnection = initializePeerConnection(stream);
        const callDoc = getCallDocRef();
        const offerCandidates = getOfferCandidatesCollection();
        const answerCandidates = getAnswerCandidatesCollection();

        // Get candidates for caller, save to db
        peerConnection.onicecandidate = (event: any) => {
            if (event.candidate) {
                addDoc(offerCandidates, event.candidate.toJSON());
            }
        };

        // Create offer
        const offerDescription = await peerConnection.createOffer({});
        await peerConnection.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await setDoc(callDoc, { offer, status: 'calling' });

        // Listen for remote answer
        const unsubCall = onSnapshot(callDoc, (snapshot: any) => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                peerConnection.setRemoteDescription(answerDescription).then(() => {
                    processCandidateQueue(peerConnection);
                });
            }
        });

        // Listen for remote ICE candidates
        const unsubCandidates = onSnapshot(answerCandidates, (snapshot: any) => {
            snapshot.docChanges().forEach((change: any) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    addIceCandidateSafely(peerConnection, candidate);
                }
            });
        });

        return () => {
            unsubCall();
            unsubCandidates();
        };
    };

    // Callee Side (Owner)
    const joinCall = async () => {
        setIsCallActive(true);
        const stream = await setupLocalStream();
        if (!stream) {
            setConnectionStatus('failed');
            return;
        }

        const peerConnection = initializePeerConnection(stream);
        const callDoc = getCallDocRef();
        const offerCandidates = getOfferCandidatesCollection();
        const answerCandidates = getAnswerCandidatesCollection();

        peerConnection.onicecandidate = (event: any) => {
            if (event.candidate) {
                addDoc(answerCandidates, event.candidate.toJSON());
            }
        };

        const callSnapshot = await getDoc(callDoc);
        const callData = callSnapshot.data();

        if (!callData?.offer) {
            console.error("No offer found to join call");
            setConnectionStatus('failed');
            return;
        }

        // Set remote description FIRST (Offer)
        const offerDescription = callData.offer;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

        // Listen for offer candidates NOW that remote is set (mostly)
        // Note: Firestore might deliver these instantly if they exist, so we need to be ready.
        // Since we await setRemoteDescription above, we are good. 
        // But if new ones come in, we use addIceCandidateSafely just to be sure.
        onSnapshot(offerCandidates, (snapshot: any) => {
            snapshot.docChanges().forEach((change: any) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    addIceCandidateSafely(peerConnection, candidate);
                }
            });
        });

        const answerDescription = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await updateDoc(callDoc, { answer, status: 'connected' });
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const switchCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                // @ts-ignore - _switchCamera is a react-native-webrtc specific method on the track
                if (track._switchCamera) {
                    // @ts-ignore
                    track._switchCamera();
                }
                // For web, it's more complex (getUserMedia again), we will skip for now or implement later
            });
        }
    };

    return {
        localStream,
        remoteStream,
        isCallActive,
        connectionStatus,
        startCall,
        joinCall,
        endCall: cleanup,
        toggleMute,
        isMuted,
        switchCamera
    };
};
