import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { House, Send, RefreshCw, CircleCheckBig, X as CloseIcon } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type Property } from '@/types/Property';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { SmartLockItem, type LockState } from '@/components/SmartLockItem';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react-native';
import { collection, addDoc, onSnapshot, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

const generateGuestId = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

type WebGuestScreenRouteProp = RouteProp<{ params: { property: Property } }, 'params'>;

export default function WebGuestScreen() {
  const route = useRoute<WebGuestScreenRouteProp>();
  const { property } = route.params;

  // -- Original State --
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [guestId, setGuestId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // -- PIN Access State --
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showLocks, setShowLocks] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // -- Request Status State --
  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [isDeclined, setIsDeclined] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  // -- WebRTC State --
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  // PIN digit states for 4-box input
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pin3, setPin3] = useState('');
  const [pin4, setPin4] = useState('');

  // Refs for PIN inputs
  const pin1Ref = useRef<any>(null);
  const pin2Ref = useRef<any>(null);
  const pin3Ref = useRef<any>(null);
  const pin4Ref = useRef<any>(null);

  // -- Refs --
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // -- Effects (Original) --
  useEffect(() => {
    const startPulse = () => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    };
    startPulse();
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= 5) {
            stopRecording();
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
            }
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // -- Handlers (Original) --
  const saveVideoToStorage = async (blob: Blob) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          await AsyncStorage.setItem('temp_guest_video', base64data);
          // Set the video URL for preview from the blob directly for immediate feedback
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          resolve();
        } catch (e) {
          console.error('Failed to save video to storage', e);
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startWebRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });

      const mimeTypes = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm', 'video/ogg'];
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);

      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (videoChunksRef.current.length > 0) {
          const blobType = videoChunksRef.current[0]?.type || 'video/webm';
          const videoBlob = new Blob(videoChunksRef.current, { type: blobType });
          await saveVideoToStorage(videoBlob);
        }
        setShowSendButton(true);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      // Start 5 second timer logic immediately upon recording start
    } catch (error) {
      console.error('Error starting web recording:', error);
      Alert.alert('Error', 'Failed to access camera. Please ensure camera permissions are granted.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (Platform.OS === 'web' && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setShowSendButton(true);
    }
    setIsRecording(false);
  };

  const handleStartPreview = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        alert("Camera permission is required to ring the doorbell.");
        return;
      }
    }
    const newGuestId = generateGuestId();
    setGuestId(newGuestId);
    setIsPreviewing(true);
    setRecordedVideoUrl(null);
  };

  const handleStartRecording = async () => {
    setIsPreviewing(false);
    setIsRecording(true);
    setIsPreviewing(false);
    setIsRecording(true);
    // Let's stick to the countdown going up logic or down. The effect uses going up.
    // Actually the user said "start recording for 5 secs". I'll reset time to 0 and let the effect run.
    setRecordingTime(0);
    setShowSendButton(false);

    if (Platform.OS === 'web') {
      await startWebRecording();
    }
  };

  // Removed previous handleStartRecording in favor of split methods above, ensuring no duplicates.

  // New state for sending status
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      let downloadUrl = '';
      if (videoChunksRef.current.length > 0) {
        const blobType = videoChunksRef.current[0]?.type || 'video/webm';
        const extension = blobType.includes('mp4') ? 'mp4' : 'webm';
        const videoBlob = new Blob(videoChunksRef.current, { type: blobType });

        try {
          const videoRef = ref(storage, `guest-videos/${guestId}.${extension}`);
          await uploadBytes(videoRef, videoBlob);
          downloadUrl = await getDownloadURL(videoRef);
          console.log('Uploaded Video URI:', downloadUrl);
        } catch (uploadError) {
          console.error('Error uploading video:', uploadError);
          alert('Failed to upload video. Please try again.');
          setIsSending(false);
          return;
        }
      }

      // Save to subcollection: properties/{propertyId}/guestRequests
      const requestData = {
        guestId,
        propertyId: property.propertyId || property.id, // Fallback to id if propertyId is missing
        propertyName: property.propertyName || 'Property',
        timestamp: new Date().toISOString(),
        status: 'pending',
        userId: property.userId,
        videoUrl: downloadUrl,
      };

      const docRef = await addDoc(collection(db, 'properties', property.id!, 'guestRequests'), requestData);
      setRequestDocId(docRef.id);

      // Update property to indicate it has pending requests
      try {
        await updateDoc(doc(db, 'properties', property.id!), {
          hasPendingRequest: true,
          lastRequestTimestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed to update property pending status", err);
        // Not blocking
      }

      setIsRecording(false);
      setIsWaiting(true);
      setShowSendButton(false); // Clear review mode so we don't replay video later
    } catch (error) {
      console.error('Error sending guest request:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRetake = async () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    await AsyncStorage.removeItem('temp_guest_video');

    setIsRecording(false);
    setIsPreviewing(false);
    setShowSendButton(false);
    setRecordingTime(0);
    setGuestId(''); // Reset to allow starting over
    videoChunksRef.current = [];
    setRequestDocId(null);
    setIsDeclined(false);
  };

  // -- Handlers (New PIN Flow) --
  const handlePinSubmit = async () => {
    const fullPin = `${pin1}${pin2}${pin3}${pin4}`;

    if (fullPin.length < 4) {
      setPinError('Please enter a valid 4-digit PIN');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');

    try {
      // Fetch latest property data to ensure we have the most up-to-date guest list
      let guests = property.guests || [];

      if (property.id) {
        const propertyRef = doc(db, 'properties', property.id);
        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          const propertyData = propertySnap.data() as Property;
          if (propertyData.guests) {
            guests = propertyData.guests;
          }
        }
      }

      console.log('🔍 PIN Validation Debug:');
      console.log('Entered PIN:', fullPin);

      const matchingGuest = guests.find(g => g.accessPin === fullPin);

      console.log('Matching guest:', matchingGuest);

      if (matchingGuest) {
        // Time validation with better logging
        const now = new Date();
        const start = new Date(matchingGuest.startTime);
        const end = new Date(matchingGuest.endTime);

        console.log('Time validation:');
        console.log('  Current time:', now.toISOString());
        console.log('  Start time:', start.toISOString());
        console.log('  End time:', end.toISOString());

        // Check buffers
        const bufferMs = 60 * 1000; // 1 minute buffer

        if (now.getTime() < (start.getTime() - bufferMs)) {
          console.log('❌ Access not yet active');
          setPinError('Access not yet active');
          setIsVerifyingPin(false);
          return;
        }
        if (now.getTime() > (end.getTime() + bufferMs)) {
          console.log('❌ Access expired');
          setPinError('Access expired');
          setIsVerifyingPin(false);
          return;
        }

        console.log('✅ PIN verified successfully');
        setIsPinVerified(true);
        setPinError('');
      } else {
        console.log('❌ No matching guest found');
        setPinError('PIN Incorrect, Try Again');
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setPinError('Error verifying PIN, please try again');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleViewLocks = () => {
    setIsPinModalVisible(false);
    setShowLocks(true);
  }

  // PIN input handlers for 4-box UI
  const handlePinChange = (value: string, position: number) => {
    // Only allow single digit
    if (value.length > 1) return;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    switch (position) {
      case 1:
        setPin1(value);
        if (value && pin2Ref.current) pin2Ref.current.focus();
        break;
      case 2:
        setPin2(value);
        if (value && pin3Ref.current) pin3Ref.current.focus();
        break;
      case 3:
        setPin3(value);
        if (value && pin4Ref.current) pin4Ref.current.focus();
        break;
      case 4:
        setPin4(value);
        break;
    }
  };

  const handlePinKeyPress = (e: any, position: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      switch (position) {
        case 2:
          if (!pin2 && pin1Ref.current) pin1Ref.current.focus();
          break;
        case 3:
          if (!pin3 && pin2Ref.current) pin2Ref.current.focus();
          break;
        case 4:
          if (!pin4 && pin3Ref.current) pin3Ref.current.focus();
          break;
      }
    }
  };

  const resetPinInputs = () => {
    setPin1('');
    setPin2('');
    setPin3('');
    setPin4('');
    setPinError('');
    if (pin1Ref.current) pin1Ref.current.focus();
  };

  const handleLockStateChange = (deviceId: string, newState: Partial<LockState>) => {
    console.log('Lock update:', deviceId, newState);
    // In a real app we'd update state or call API here
  };

  // -- Effects (New) --
  useEffect(() => {
    if (!requestDocId || !property.id) return;

    const unsubscribe = onSnapshot(doc(db, 'properties', property.id!, 'guestRequests', requestDocId), (snapshot) => { // Use property.id not propertyId
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.status === 'declined') {
          setIsDeclined(true);
          setIsWaiting(false); // Stop waiting
        }
        if (data?.status === 'accepted') {
          setIsWaiting(false);
          setIsIncomingCall(true);
        }
      }
    });

    return () => unsubscribe();
  }, [requestDocId, property.id]);

  const handleEndCall = async (resetState: boolean = true) => {
    console.log('🔌 Ending WebRTC call...');

    // Stop local tracks
    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setRemoteStream(null);
    setIsCallActive(false);
    setIsIncomingCall(false);

    if (resetState) {
      setGuestId(''); // Reset only if explicitly requested
      setIsPreviewing(false);
      setIsRecording(false);
      setShowSendButton(false);
    } else {
      // On error, return to incoming call screen to allow retry
      setIsIncomingCall(true);
    }
  };

  const handleJoinCall = async () => {
    console.log('🎥 Guest joining WebRTC call...');
    setIsIncomingCall(false);
    setIsCallActive(true);

    try {
      // 1. Get Local Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      localStream.current = stream;

      // Play local stream immediately in UI if ref exists
      const localVideo = document.getElementById('local-player-video') as HTMLVideoElement;
      if (localVideo) localVideo.srcObject = stream;

      // 2. Create Peer Connection
      const pc = new RTCPeerConnection(configuration);
      peerConnection.current = pc;

      // 3. Add Local Tracks to PC
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Handle Remote Tracks
      pc.ontrack = (event) => {
        console.log('✅ Remote track received');
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          const remoteVideo = document.getElementById('remote-player-video') as HTMLVideoElement;
          if (remoteVideo) remoteVideo.srcObject = event.streams[0];
        }
      };

      // 5. Create Signaling Path
      const signalingPath = `properties/${property.id}/guestRequests/${requestDocId}/signaling`;
      const iceCandidatesCol = collection(db, signalingPath, 'iceCandidates', 'candidates');

      // 6. Handle ICE Candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📤 Sending ICE Candidate');
          await addDoc(iceCandidatesCol, event.candidate.toJSON());
        }
      };

      // 7. Create Offer
      console.log('📝 Creating Offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerData = {
        sdp: offer.sdp,
        type: offer.type,
      };

      // 8. Save Offer to Firestore
      await updateDoc(doc(db, 'properties', property.id!, 'guestRequests', requestDocId!), {
        webrtcSignaling: true
      });
      await setDoc(doc(db, signalingPath, 'offer'), offerData);

      // 9. Listen for Answer
      const unsubAnswer = onSnapshot(doc(db, signalingPath, 'answer'), async (snapshot) => {
        const data = snapshot.data();
        if (data && !pc.remoteDescription) {
          console.log('📥 Received Answer');
          const answer = new RTCSessionDescription({
            type: data.type,
            sdp: data.sdp,
          } as RTCSessionDescriptionInit);
          await pc.setRemoteDescription(answer);
        }
      });

      // 10. Listen for Remote ICE Candidates
      const remoteIceCol = collection(db, signalingPath, 'remoteIceCandidates');
      const unsubIce = onSnapshot(remoteIceCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            console.log('📥 Received Remote ICE Candidate');
            await pc.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      });

      // Cleanup listeners on end call
      pc.onconnectionstatechange = () => {
        console.log('🔗 PC Connection State:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
          handleEndCall();
        }
      };

    } catch (error) {
      console.error('❌ Error initializing WebRTC call:', error);
      Alert.alert('Error', 'Failed to start call. Please check your camera permissions.');
      handleEndCall(false);
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // No longer needed since we handle remote streams via ontrack and srcObject
  useEffect(() => {
    if (isCallActive) {
      // Ensure local video is attached if stream exists
      setTimeout(() => {
        const localVideo = document.getElementById('local-player-video') as HTMLVideoElement;
        const remoteVideo = document.getElementById('remote-player-video') as HTMLVideoElement;
        if (localVideo && localStream.current) localVideo.srcObject = localStream.current;
        if (remoteVideo && remoteStream) remoteVideo.srcObject = remoteStream;
      }, 100);
    }
  }, [isCallActive, remoteStream]);

  useEffect(() => {
    return () => {
      localStream.current?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
    };
  }, []);

  // -- Render Logic --

  // -- Render Logic --

  // 0. Active Call View
  if (isCallActive) {
    return (
      <View style={styles.container}>
        {/* Remote Video Container - Full Screen */}
        <video
          id="remote-player-video"
          autoPlay
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            objectFit: 'contain'
          }}
        />

        {/* Local Video Container - PIP */}
        <video
          id="local-player-video"
          autoPlay
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 120,
            height: 160,
            borderRadius: 12,
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.3)',
            zIndex: 10,
            backgroundColor: '#222',
            objectFit: 'cover'
          }}
        />

        {!remoteStream && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>Connecting...</Text>
          </View>
        )}

        <View style={styles.callControlsContainer}>
          <TouchableOpacity style={[styles.controlButton]} onPress={toggleMute}>
            {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#ef4444', width: 64, height: 64, borderRadius: 32 }]} onPress={() => handleEndCall()}>
            <PhoneOff color="white" size={32} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton]} onPress={toggleVideo}>
            {isVideoEnabled ? <VideoIcon color="white" size={24} /> : <VideoOff color="white" size={24} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 0.5 Incoming Call View
  if (isIncomingCall) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingContainer}>
          <View style={[styles.sendIconContainer, { backgroundColor: '#darkgreen' }]}>
            {/* Placeholder for owner avatar if we had it */}
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
          <Text style={styles.waitingTitle}>Incoming Call</Text>
          <Text style={styles.waitingText}>Property Owner is calling you.</Text>

          <TouchableOpacity style={[styles.waitingButton, { backgroundColor: '#10b981', flexDirection: 'row', gap: 10 }]} onPress={handleJoinCall}>
            <Phone color="white" size={24} />
            <Text style={[styles.waitingButtonText, { color: 'white' }]}>Accept Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 1. Locks View
  if (showLocks) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{property.propertyName} 🏠</Text>
          <Text style={styles.headerSubtitle}>{property.address}</Text>
        </View>

        <ScrollView style={styles.locksList}>
          {property.smartLocks.map((lock, index) => (
            <SmartLockItem
              key={index}
              lock={{
                ...lock,
                isLocked: true, // Default state
              } as LockState}
              onLockStateChange={handleLockStateChange}
              onEdit={() => { }}
            />
          ))}

          <TouchableOpacity style={styles.exitButton} onPress={() => {
            setShowLocks(false);
            setIsPinVerified(false);
            resetPinInputs();
          }}>
            <Text style={styles.exitButtonText}>Exit Property ↪</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // 3. Declined View
  if (isDeclined) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingContainer}>
          <View style={[styles.sendIconContainer, { backgroundColor: '#ef4444' }]}>
            <CloseIcon size={80} color="white" />
          </View>
          <Text style={styles.waitingTitle}>Request Declined</Text>
          <Text style={styles.waitingText}>
            The property owner has declined your request at this time.
          </Text>
          <TouchableOpacity
            style={[styles.waitingButton, { backgroundColor: '#333' }]}
            onPress={() => {
              setIsDeclined(false);
              handleRetake();
            }}
          >
            <Text style={styles.waitingButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. Waiting View
  if (isWaiting) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingContainer}>
          <View style={styles.sendIconContainer}>
            <Send size={80} color="#4ade80" />
          </View>
          <Text style={styles.waitingTitle}>Video has been sent to{'\n'}Property Owner</Text>
          <Text style={styles.waitingText}>
            We are connecting you with the property owner shortly. Please don't close this page.
          </Text>
          <TouchableOpacity style={styles.waitingButton}>
            <Text style={styles.waitingButtonText}>Waiting for call...</Text>
            <Animated.Text style={styles.waitingSpinner}>⏳</Animated.Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 5. Main View (Camera + Start)
  return (
    <View style={styles.container}>
      {guestId && (
        <View style={styles.guestIdBadge}>
          <Text style={styles.guestIdText}>Guest ID: {guestId}</Text>
        </View>
      )}

      {!isRecording && !isPreviewing && !guestId && (
        <>
          <View style={styles.infoContainer}>
            <View style={styles.houseIconContainer}>
              <House size={64} color="#e67e22" fill="#e67e22" />
            </View>
            <Text style={styles.houseName}>{property.propertyName || 'Property'}</Text>
            <Text style={styles.address}>{property.address || 'No address available'}</Text>
          </View>

          <TouchableOpacity style={styles.ringButtonCapsule} onPress={handleStartPreview}>
            <Text style={styles.ringButtonText}>Ring DoorBell</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Preview/Recording Center Container */}
      <View style={styles.centerContainer}>
        {isPreviewing || isRecording || showSendButton ? (
          <View style={styles.cameraWrapper}>
            <View style={styles.cameraContainer}>
              {Platform.OS === 'web' ? (
                showSendButton && recordedVideoUrl ? (
                  // Review Mode
                  <video
                    src={recordedVideoUrl}
                    controls
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  // Live Camera (Preview or Recording)
                  <video
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    ref={(video) => {
                      if (video && (isPreviewing || isRecording)) {
                        navigator.mediaDevices
                          .getUserMedia({ video: { facingMode: 'user' }, audio: false })
                          .then((stream) => {
                            video.srcObject = stream;
                          })
                          .catch((err) => console.error('Camera preview error:', err));
                      }
                    }}
                  />
                )
              ) : permission?.granted ? (
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="front"
                />
              ) : (
                <View style={styles.recordingPlaceholder}>
                  <Text style={{ color: 'white' }}>Camera Preview...</Text>
                </View>
              )}

              {/* Flash/Icon Indicator */}
              {isRecording && (
                <View style={styles.flashIndicator}>
                  <View style={styles.flashIcon}>
                    <Text style={styles.flashIconText}>⚡</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Start Recording Button Overlay */}
            {isPreviewing && (
              <TouchableOpacity style={styles.startRecordingButtonOverlay} onPress={handleStartRecording}>
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            )}

            <Text style={styles.cameraHint}>Make sure your face is visible</Text>
          </View>
        ) : null}
      </View>

      {isRecording && !showSendButton && (
        <View style={styles.recordingCounterContainer}>
          <Text style={styles.recordingCounter}>{recordingTime}</Text>
        </View>
      )}

      {showSendButton && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.retakeButton, isSending && { opacity: 0.5 }]}
            onPress={handleRetake}
            disabled={isSending}
          >
            <RefreshCw size={16} color="#4ade80" />
            <Text style={styles.retakeText}>Retake Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, isSending && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={isSending}
          >
            <Send size={16} color="white" />
            <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && !isPreviewing && !guestId && (
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            This triggers a 5-second front-camera{'\n'}recording which is sent to the owner.
          </Text>
          {/* Updated Link Button */}
          <TouchableOpacity style={styles.linkButton} onPress={() => setIsPinModalVisible(true)}>
            <Text style={styles.linkText}>I have an access pin</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PIN Access Modal */}
      <Modal
        visible={isPinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => {
              setIsPinModalVisible(false);
              resetPinInputs();
              setIsPinVerified(false);
            }}>
              <CloseIcon size={24} color="white" />
            </TouchableOpacity>

            {!isPinVerified ? (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{property.propertyName}</Text>
                    <Text style={styles.modalAddress}>{property.address}</Text>
                  </View>
                  <Text style={styles.modalEmoji}>🏠</Text>
                </View>

                <Text style={styles.pinLabel}>Enter Access PIN</Text>

                <View style={styles.pinInputContainer}>
                  <TextInput
                    ref={pin1Ref}
                    style={styles.pinBox}
                    value={pin1}
                    onChangeText={(val) => handlePinChange(val, 1)}
                    onKeyPress={(e) => handlePinKeyPress(e, 1)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                  <TextInput
                    ref={pin2Ref}
                    style={styles.pinBox}
                    value={pin2}
                    onChangeText={(val) => handlePinChange(val, 2)}
                    onKeyPress={(e) => handlePinKeyPress(e, 2)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                  <TextInput
                    ref={pin3Ref}
                    style={styles.pinBox}
                    value={pin3}
                    onChangeText={(val) => handlePinChange(val, 3)}
                    onKeyPress={(e) => handlePinKeyPress(e, 3)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                  <TextInput
                    ref={pin4Ref}
                    style={styles.pinBox}
                    value={pin4}
                    onChangeText={(val) => handlePinChange(val, 4)}
                    onKeyPress={(e) => handlePinKeyPress(e, 4)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                </View>

                {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

                <TouchableOpacity
                  style={[styles.confirmButton, isVerifyingPin && { opacity: 0.7 }]}
                  onPress={handlePinSubmit}
                  disabled={isVerifyingPin}
                >
                  <Text style={styles.confirmButtonText}>
                    {isVerifyingPin ? 'Verifying...' : 'Confirm PIN'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successIconContainer}>
                  <CircleCheckBig size={80} color="white" />
                </View>
                <Text style={styles.successTitle}>Access PIN code confirmed</Text>
                <Text style={styles.successSubtitle}>Click button below to View property locks</Text>

                <TouchableOpacity style={styles.confirmButton} onPress={handleViewLocks}>
                  <Text style={styles.confirmButtonText}>View Locks</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  guestIdBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    position: 'absolute',
    top: 60,
    zIndex: 10,
  },
  guestIdText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  houseIconContainer: {
    marginBottom: 20,
  },
  houseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  address: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  ringButtonCapsule: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
  },
  ringButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  cameraWrapper: {
    alignItems: 'center',
  },
  cameraContainer: {
    width: 280,
    height: 350,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'black',
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  recordingPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  flashIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIconText: {
    fontSize: 20,
  },
  cameraHint: {
    color: 'white',
    fontSize: 14,
    marginTop: 16,
  },
  recordingCounterContainer: {
    width: 280,
    paddingVertical: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 40,
    alignItems: 'center',
  },
  recordingCounter: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionButtonsContainer: {
    width: '100%',
    paddingHorizontal: 40,
    gap: 24,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  retakeText: {
    color: '#4ade80',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  disclaimer: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 14,
    lineHeight: 20,
  },
  linkButton: {
    marginBottom: 20,
  },
  linkText: {
    color: '#4ade80',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  sendIconContainer: {
    marginBottom: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  waitingText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  waitingButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 280,
    justifyContent: 'center',
  },
  waitingButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  startRecordingButtonOverlay: {
    position: 'absolute',
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 20,
  },
  recordButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff4444',
  },
  waitingSpinner: {
    fontSize: 16,
  },

  // -- PIN Modal Styles --
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end', // Bottom sheet style
  },
  modalContent: {
    backgroundColor: '#222',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
  },
  modalHeader: {
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 30,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  modalAddress: {
    color: '#aaa',
    fontSize: 12,
  },
  modalEmoji: {
    fontSize: 24
  },
  pinLabel: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 30, // Increased margin
    width: '100%',
  },
  pinBox: {
    backgroundColor: 'transparent', // Looks transparent/dark in design
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 65, // Slightly larger
    height: 75, // Taller like screenshot
    borderRadius: 12,
    borderWidth: 1.5, // Thinner, crisp border
    borderColor: 'white', // White border
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 10,
  },
  confirmButton: {
    backgroundColor: '#4ade80',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmButtonText: {
    color: 'white', // White text
    fontWeight: 'bold',
    fontSize: 16,
  },
  successIconContainer: {
    marginVertical: 40,
  },
  successTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  successSubtitle: {
    color: '#aaa',
    marginBottom: 30,
    textAlign: 'center'
  },
  // Locks View Styles
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  locksList: {
    width: '100%',
    paddingHorizontal: 20,
  },
  exitButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  exitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  callControlsContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    zIndex: 20,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
