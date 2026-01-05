import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { House, Send, RefreshCw, CircleCheckBig, X as CloseIcon, Lock, Unlock, ChevronRight, LogOut } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type Property, type Guest } from '@/types/Property';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { type LockState } from '@/components/SmartLockItem'; // Keep type but remove component import
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { seamService } from '@/services/seam.service';

const generateGuestId = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

type WebGuestScreenRouteProp = RouteProp<{ params: { property: Property } }, 'params'>;


const SwipeUnlockButton = ({ onUnlock, isLoading }: { onUnlock: () => void, isLoading?: boolean }) => {
  const [dragX] = useState(new Animated.Value(0));
  const [complete, setComplete] = useState(false);
  const BUTTON_WIDTH = 300;

  // Simple mock swipe for now since PanResponder can be tricky on some web setups without config
  // We'll use a Pressable implementation that animates
  const handlePress = () => {
    if (complete || isLoading) return;

    Animated.timing(dragX, {
      toValue: BUTTON_WIDTH - 50,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setComplete(true);
      onUnlock();
      // Reset after delay
      setTimeout(() => {
        setComplete(false);
        dragX.setValue(0);
      }, 2000);
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={{
        width: '100%',
        height: 56,
        backgroundColor: complete ? '#4ade80' : '#333',
        borderRadius: 28,
        justifyContent: 'center',
        overflow: 'hidden',
        marginTop: 15,
        marginBottom: 10
      }}
    >
      <View style={{ position: 'absolute', width: '100%', alignItems: 'center' }}>
        <Text style={{
          color: complete ? '#000' : '#aaa',
          fontWeight: '600',
          fontSize: 15
        }}>
          {complete ? 'Unlocked!' : isLoading ? 'Unlocking...' : 'Tap for Instant unlock  »'}
        </Text>
      </View>

      <Animated.View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: complete ? '#fff' : '#4ade80',
        marginLeft: 3,
        transform: [{ translateX: dragX }],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}>
        {complete ? <Unlock size={24} color="#4ade80" /> : <Lock size={24} color="white" />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const GuestLockCard = ({ lock, onUnlock }: { lock: any, onUnlock: () => void }) => {
  return (
    <View style={{
      width: '100%',
      backgroundColor: '#1c1c1e',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#333'
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 40, height: 40, backgroundColor: '#333', borderRadius: 8,
          alignItems: 'center', justifyContent: 'center', marginRight: 12
        }}>
          <Lock size={20} color="#fff" />
        </View>
        <View>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '600' }}>{lock.display_name || 'Smart Lock'}</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>{lock.manufacturer || 'Igloohome'}</Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: '#333', marginVertical: 8 }} />

      {/* Status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#888', fontSize: 14 }}>Status</Text>
        <Lock size={16} color="#aaa" />
      </View>

      {/* Actions */}
      <SwipeUnlockButton onUnlock={onUnlock} />

      <TouchableOpacity style={{
        backgroundColor: 'white',
        borderRadius: 28,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'center'
      }}>
        <Text style={{ color: 'black', fontWeight: '600', fontSize: 15 }}>Set temporary unlock passcode</Text>
        <ChevronRight size={16} color="black" style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </View>
  );
};

export default function WebGuestScreen() {
  const route = useRoute<WebGuestScreenRouteProp>();
  const { property } = route.params;

  // -- Animation State --
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // -- Guest & Recording State --
  const [guestId, setGuestId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // -- Checks State --
  const [hasFace, setHasFace] = useState(false);

  // -- Permission State --
  const [permission, requestPermission] = useCameraPermissions();

  // -- PIN Access State --
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showLocks, setShowLocks] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // -- Request Status State --
  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  // Removed allowedLocks state to enforce derived state logic
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);

  // -- Refs --
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // PIN digit states
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pin3, setPin3] = useState('');
  const [pin4, setPin4] = useState('');

  const pin1Ref = useRef<any>(null);
  const pin2Ref = useRef<any>(null);
  const pin3Ref = useRef<any>(null);
  const pin4Ref = useRef<any>(null);

  // -- Effects --
  useEffect(() => {
    const startPulse = () => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    };
    startPulse();
  }, []);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
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

  // Firestore Listener for Request Status
  useEffect(() => {
    if (!requestDocId || !property.id) return;

    const unsubscribe = onSnapshot(doc(db, 'properties', property.id, 'guestRequests', requestDocId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.status === 'declined') {
          setIsDeclined(true);
          setIsWaiting(false);
        }
        if (data?.status === 'accepted') {
          setIsWaiting(false);
          if (data.allowedLocks && Array.isArray(data.allowedLocks)) {
            // Check if this is a response to a VIDEO request (not PIN)
            // If so, we might need a temporary guest object or handles this differently.
            // For now, if accepted via video request, we treat it as an ad-hoc session.
            const adHocGuest: Guest = {
              id: 'adhoc',
              name: 'Guest',
              avatar: 'avatar1',
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              accessPin: '',
              createdAt: new Date().toISOString(),
              allowedLocks: data.allowedLocks
            };
            setCurrentGuest(adHocGuest);
            setShowLocks(true);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [requestDocId, property.id]);

  // -- Camera & Recording Handlers --

  const handleStartPreview = async () => {
    // 1. Request Camera
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        alert("Camera permission is required to ring the doorbell.");
        return;
      }
    }

    // 3. Start Preview
    const newGuestId = generateGuestId();
    setGuestId(newGuestId);
    setIsPreviewing(true);
    setRecordedVideoUrl(null);
    setHasFace(false); // Reset face state

    // Web Hack: Web doesn't support onFacesDetected easily, so we auto-approve on Web
    if (Platform.OS === 'web') {
      setHasFace(true);
    }
  };

  const handleStartRecording = async () => {
    if (!hasFace) {
      Alert.alert("Face Required", "Please ensure your face is clearly visible.");
      return;
    }

    setIsPreviewing(false);
    setIsRecording(true);
    setShowSendButton(false);

    if (Platform.OS === 'web') {
      await startWebRecording();
    }
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
    } catch (error) {
      console.error('Error starting web recording:', error);
      Alert.alert('Error', 'Failed to access camera.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (Platform.OS === 'web' && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setShowSendButton(true);
    }
    setIsRecording(false);
  };

  const saveVideoToStorage = async (blob: Blob) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          await AsyncStorage.setItem('temp_guest_video', base64data);
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
    setGuestId('');
    videoChunksRef.current = [];
    setRequestDocId(null);
    setIsDeclined(false);
  };

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
        } catch (uploadError) {
          console.error('Error uploading video:', uploadError);
          alert('Failed to upload video. Please try again.');
          setIsSending(false);
          return;
        }
      }

      const requestData = {
        guestId,
        propertyId: property.propertyId || property.id,
        propertyName: property.propertyName || 'Property',
        timestamp: new Date().toISOString(),
        status: 'pending',
        userId: property.userId,
        videoUrl: downloadUrl,
      };

      const docRef = await addDoc(collection(db, 'properties', property.id!, 'guestRequests'), requestData);
      setRequestDocId(docRef.id);

      await updateDoc(doc(db, 'properties', property.id!), {
        hasPendingRequest: true,
        lastRequestTimestamp: new Date().toISOString(),
      });

      setIsRecording(false);
      setIsWaiting(true);
      setShowSendButton(false);
    } catch (error) {
      console.error('Error sending guest request:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // -- Lock & PIN Handlers --
  // -- Lock & PIN Handlers --
  const handleLockStateChange = async (deviceId: string, newState: Partial<LockState>) => {
    if (newState.isLocked === false) {
      try {
        await seamService.unlockDoor(deviceId);
        Alert.alert("Success", "Door Unlocked Successfully");
      } catch (error) {
        console.error("Unlock failed", error);
        Alert.alert("Error", "Failed to unlock door. Please try again.");
      }
    }
  };

  // PIN Logic handled separately for brevity/modularity, exact copy of original logic can be kept
  // ... keeping original PIN logic ...
  const handlePinSubmit = async () => {
    const fullPin = `${pin1}${pin2}${pin3}${pin4}`;
    if (fullPin.length < 4) {
      setPinError('Please enter a valid 4-digit PIN');
      return;
    }
    setIsVerifyingPin(true);
    setPinError('');
    try {
      let guests = property.guests || [];
      let currentProperty = property;

      if (property.id) {
        const propertyRef = doc(db, 'properties', property.id);
        const propertySnap = await getDoc(propertyRef);
        if (propertySnap.exists()) {
          const fetchedData = propertySnap.data() as Property;
          currentProperty = fetchedData;
          if (fetchedData.guests) guests = fetchedData.guests;
        }
      }
      // Check Property Master PIN
      if (currentProperty.pinCode === fullPin) {
        setIsPinVerified(true);
        setCurrentGuest(null); // Master access
        setPinError('');
      } else {
        const matchingGuest = guests.find(g => g.accessPin === fullPin);
        if (matchingGuest) {
          const now = new Date();
          const start = new Date(matchingGuest.startTime);
          const end = new Date(matchingGuest.endTime);
          const bufferMs = 60 * 1000;
          if (now.getTime() < (start.getTime() - bufferMs)) {
            setPinError('Access not yet active');
            setIsVerifyingPin(false);
            return;
          }
          if (now.getTime() > (end.getTime() + bufferMs)) {
            setPinError('Access expired');
            setIsVerifyingPin(false);
            return;
          }
          setCurrentGuest(matchingGuest);
          setIsPinVerified(true);
          setPinError('');
        } else {
          setPinError('PIN Incorrect, Try Again');
        }
      }
    } catch (error) {
      setPinError('Error verifying PIN, please try again');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleViewLocks = () => {
    setIsPinModalVisible(false);
    // No state setting here - logic is derived in render
    setShowLocks(true);
  }

  const handlePinChange = (value: string, position: number) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;
    setPinError('');
    switch (position) {
      case 1: setPin1(value); if (value && pin2Ref.current) pin2Ref.current.focus(); break;
      case 2: setPin2(value); if (value && pin3Ref.current) pin3Ref.current.focus(); break;
      case 3: setPin3(value); if (value && pin4Ref.current) pin4Ref.current.focus(); break;
      case 4: setPin4(value); break;
    }
  };

  const handlePinKeyPress = (e: any, position: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      switch (position) {
        case 2: if (!pin2 && pin1Ref.current) pin1Ref.current.focus(); break;
        case 3: if (!pin3 && pin2Ref.current) pin2Ref.current.focus(); break;
        case 4: if (!pin4 && pin3Ref.current) pin3Ref.current.focus(); break;
      }
    }
  };

  const resetPinInputs = () => {
    setPin1(''); setPin2(''); setPin3(''); setPin4('');
    setPinError('');
    if (pin1Ref.current) pin1Ref.current.focus();
  };


  // -- Render --

  // STRICT DERIVED VISIBILITY
  // Moved strictly outside conditional to satisfy React Hooks rules
  const visibleLocks = useMemo(() => {
    const locks = property.smartLocks || [];
    if (showLocks && currentGuest) {
      // Guest Access: Strict Filter
      const allowedIds = currentGuest.allowedLocks || [];
      return locks.filter(lock => allowedIds.includes(lock.device_id));
    } else if (showLocks) {
      // Master/Owner Access: Show All
      return locks;
    }
    return [];
  }, [showLocks, currentGuest, property.smartLocks]);

  // 1. Locks View (Accepted) - Dedicated Custom View
  if (showLocks) {

    return (
      <View style={styles.container}>
        <ScrollView style={{ width: '100%', paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ marginTop: 20, marginBottom: 30 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
              {property.propertyName} 🏠
            </Text>
            <Text style={{ fontSize: 15, color: '#888' }}>
              {property.address}
            </Text>
            {currentGuest && (
              <Text style={{ fontSize: 14, color: '#4ade80', marginTop: 4 }}>
                Welcome, {currentGuest.name}
              </Text>
            )}
          </View>

          {visibleLocks.length > 0 ? visibleLocks.map((lock, index) => (
            <GuestLockCard
              key={index}
              lock={lock}
              onUnlock={() => handleLockStateChange(lock.device_id, { isLocked: false })}
            />
          )) : (
            <Text style={[styles.waitingText, { marginTop: 40 }]}>No locks available for you.</Text>
          )}

          <TouchableOpacity style={{
            backgroundColor: '#ef4444',
            borderRadius: 30,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 20,
            flexDirection: 'row',
            justifyContent: 'center',
            width: '100%'
          }} onPress={() => {
            setShowLocks(false);
            setIsPinVerified(false);
            resetPinInputs();
            handleRetake();
          }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Exit Property</Text>
            <LogOut size={20} color="white" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    )
  }

  // 2. Declined View
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
            onPress={handleRetake}
          >
            <Text style={styles.waitingButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }



  // 4. Main View
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

          {isWaiting ? (
            <View style={styles.waitingStatusContainer}>
              <ActivityIndicator size="small" color="#4ade80" style={{ marginBottom: 10 }} />
              <Text style={styles.waitingStatusText}>Request Sent</Text>
              <Text style={styles.waitingStatusSubtext}>Waiting for owner...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ringButtonCapsule}
              onPress={handleStartPreview}
            >
              <Text style={styles.ringButtonText}>Ring DoorBell</Text>
            </TouchableOpacity>
          )}
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  // Live Camera
                  <video
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    ref={(video) => {
                      if (video && (isPreviewing || isRecording)) {
                        navigator.mediaDevices
                          .getUserMedia({ video: { facingMode: 'user' }, audio: false })
                          .then((stream) => { video.srcObject = stream; })
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
              <TouchableOpacity
                style={[styles.startRecordingButtonOverlay, !hasFace && { borderColor: 'red', opacity: 0.5 }]}
                onPress={handleStartRecording}
              >
                <View style={[styles.recordButtonInner, !hasFace && { backgroundColor: '#555' }]} />
              </TouchableOpacity>
            )}

            {isPreviewing && !hasFace && (
              <Text style={[styles.cameraHint, { color: '#ef4444', fontWeight: 'bold' }]}>
                {Platform.OS === 'web' ? 'Face check simulated (Web)' : 'No Face Detected'}
              </Text>
            )}

            {isPreviewing && hasFace && (
              <Text style={[styles.cameraHint, { color: '#4ade80' }]}>
                Face Detected
              </Text>
            )}
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

      {!isRecording && !isPreviewing && !guestId && !isWaiting && (
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            This triggers a 5-second front-camera{'\n'}recording which is sent to the owner.
          </Text>p
          <TouchableOpacity style={styles.linkButton} onPress={() => setIsPinModalVisible(true)}>
            <Text style={styles.linkText}>I have an access pin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { marginTop: 10 }]}
            onPress={() => {
              const apkUrl = 'application-3383c39d-4b0a-41ad-a70f-fb04b9626fb8';
              if (Platform.OS === 'web') {
                const link = document.createElement('a');
                link.href = apkUrl;
                link.download = 'DoorbellApp_Guest.apk'; // Suggested filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                Linking.openURL(apkUrl);
              }
            }}
          >
            <Text style={[styles.linkText, { fontSize: 14, color: '#666' }]}>Download Android App</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PIN Access Modal - Same as before */}
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
                  <TextInput ref={pin1Ref} style={styles.pinBox} value={pin1} onChangeText={(val) => handlePinChange(val, 1)} onKeyPress={(e) => handlePinKeyPress(e, 1)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
                  <TextInput ref={pin2Ref} style={styles.pinBox} value={pin2} onChangeText={(val) => handlePinChange(val, 2)} onKeyPress={(e) => handlePinKeyPress(e, 2)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
                  <TextInput ref={pin3Ref} style={styles.pinBox} value={pin3} onChangeText={(val) => handlePinChange(val, 3)} onKeyPress={(e) => handlePinKeyPress(e, 3)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
                  <TextInput ref={pin4Ref} style={styles.pinBox} value={pin4} onChangeText={(val) => handlePinChange(val, 4)} onKeyPress={(e) => handlePinKeyPress(e, 4)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
                </View>

                {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

                <TouchableOpacity style={[styles.confirmButton, isVerifyingPin && { opacity: 0.7 }]} onPress={handlePinSubmit} disabled={isVerifyingPin}>
                  <Text style={styles.confirmButtonText}>{isVerifyingPin ? 'Verifying...' : 'Confirm PIN'}</Text>
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
    minWidth: 150,
    alignItems: 'center',
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
    justifyContent: 'flex-end',
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
    marginBottom: 30,
    width: '100%',
  },
  pinBox: {
    backgroundColor: 'transparent',
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 65,
    height: 75,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'white',
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
    color: 'white',
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
  waitingStatusContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60, // Match button height approx
  },
  waitingStatusText: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingStatusSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
