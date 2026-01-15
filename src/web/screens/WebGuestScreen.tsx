import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { House, Send, RefreshCw, X as CloseIcon, PhoneOff } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type Property } from '@/types/Property';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { seamService } from '@/services/seam.service';
import { useGuestAccess } from '@/hooks/guest';
import {
  PinInput,
  PinVerifiedView,
  GuestStateMessage,
  LocksListView,
} from '../components/guest';
import { ActiveCall } from '@/components/ActiveCall';

const generateGuestId = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

type WebGuestScreenRouteProp = RouteProp<{ params: { property: Property } }, 'params'>;

export default function WebGuestScreen() {
  const route = useRoute<WebGuestScreenRouteProp>();
  const { property: initialProperty } = route.params;

  const {
    state: guestState,
    propertyData,
    isLoading: isPropertyLoading,
    verifyPin,
    confirmLockAccess,
    reset: resetGuestAccess,
  } = useGuestAccess({
    propertyId: initialProperty.id || '',
    enableRealtime: true,
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [guestId, setGuestId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [hasFace, setHasFace] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  const [isPinModalVisible, setIsPinModalVisible] = useState(false);

  const [requestDocId, setRequestDocId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [callReady, setCallReady] = useState(false); // Owner initiated call
  const [isCallActive, setIsCallActive] = useState(false); // Guest joined call
  const [showLocksFromVideo, setShowLocksFromVideo] = useState(false);
  const [videoAllowedLocks, setVideoAllowedLocks] = useState<string[]>([]);

  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  const effectivePropertyName = propertyData?.propertyName || initialProperty.propertyName || 'Property';
  const effectivePropertyAddress = propertyData?.address || initialProperty.address || '';
  const effectiveSmartLocks = propertyData?.smartLocks || [];

  useEffect(() => {
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    startPulse();
  }, [pulseAnim]);

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

  useEffect(() => {
    if (!requestDocId || !initialProperty.id) return;

    const unsubscribe = onSnapshot(
      doc(db, 'properties', initialProperty.id, 'guestRequests', requestDocId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          // Strict State Handling
          if (data?.requestDeclined || data?.status === 'declined') {
            setIsDeclined(true);
            setIsWaiting(false);
            setCallReady(false);
          }

          if (data?.callInitiated === true) {
            setCallReady(true);
            // Note: We don't auto-join. Guest must click "Join Call".
          }

          if (data?.status === 'accepted' && !data?.callInitiated) {
            // Fallback for non-call acceptance (unlock only)
            setIsWaiting(false);
            if (data.allowedLocks && Array.isArray(data.allowedLocks)) {
              setVideoAllowedLocks(data.allowedLocks);
              setShowLocksFromVideo(true);
            }
          }
        }
      }
    );

    return () => unsubscribe();
  }, [requestDocId, initialProperty.id]);

  const handleStartPreview = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to ring the doorbell.');
        return;
      }
    }

    const newGuestId = generateGuestId();
    setGuestId(newGuestId);
    setIsPreviewing(true);
    setRecordedVideoUrl(null);
    setHasFace(false);

    if (Platform.OS === 'web') {
      setHasFace(true);
    }
  };

  const handleStartRecording = async () => {
    if (!hasFace) {
      Alert.alert('Face Required', 'Please ensure your face is clearly visible.');
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
        audio: true,
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
        stream.getTracks().forEach((track) => track.stop());
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
    setShowLocksFromVideo(false);
    setVideoAllowedLocks([]);
  };

  const handleSend = async () => {
    if (!recordedVideoUrl && !videoChunksRef.current.length) {
      Alert.alert('Error', 'No video recorded');
      return;
    }

    setIsSending(true);
    try {
      const guestIdToUse = guestId || generateGuestId();
      let downloadUrl = '';

      // Upload Video
      if (recordedVideoUrl) {
        const response = await fetch(recordedVideoUrl);
        const blob = await response.blob();

        const filename = `${guestIdToUse}_${Date.now()}.webm`;
        const storageRef = ref(storage, `guest_videos/${filename}`);

        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }

      // Create Request
      const requestData = {
        guestId: guestIdToUse,
        propertyId: initialProperty.propertyId || initialProperty.id,
        propertyName: initialProperty.propertyName || 'Property',
        timestamp: new Date().toISOString(),
        status: 'pending',
        userId: initialProperty.userId,
        isVideoCall: true,
        videoUrl: downloadUrl,
        videoWatched: false,
        callInitiated: false,
        requestDeclined: false
      };

      const docRef = await addDoc(
        collection(db, 'properties', initialProperty.id!, 'guestRequests'),
        requestData
      );

      setRequestDocId(docRef.id);
      setIsWaiting(true);
      setShowSendButton(false);
      setRecordedVideoUrl(null); // Clean up local preview

      // Update property to notify owner
      await updateDoc(doc(db, 'properties', initialProperty.id!), {
        hasPendingRequest: true,
        lastRequestTimestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error sending video:', error);
      Alert.alert('Error', 'Failed to send video. Please try again.');
    } finally {
      setIsSending(false);
    }
  };


  const handleCallEnd = () => {
    setRequestDocId(null);
    setIsWaiting(false);
    setIsPreviewing(false);
    setGuestId(''); // Reset guest
  };

  // We reuse handleStartPreview to set up permissions, but instead of recording, we will offer "Start Call"


  const handleUnlockDoor = useCallback(async (deviceId: string) => {
    try {
      await seamService.unlockDoor(deviceId);
      Alert.alert('Success', 'Door Unlocked Successfully');
    } catch (error) {
      console.error('Unlock failed', error);
      Alert.alert('Error', 'Failed to unlock door. Please try again.');
    }
  }, []);

  const handlePinSubmit = useCallback((pin: string) => {
    verifyPin(pin);
  }, [verifyPin]);

  const handleViewLocks = useCallback(() => {
    setIsPinModalVisible(false);
    confirmLockAccess();
  }, [confirmLockAccess]);

  const handlePinModalClose = useCallback(() => {
    setIsPinModalVisible(false);
    resetGuestAccess();
  }, [resetGuestAccess]);

  const handleExitProperty = useCallback(() => {
    resetGuestAccess();
    setShowLocksFromVideo(false);
    setVideoAllowedLocks([]);
    handleRetake();
  }, [resetGuestAccess]);

  const getVideoAllowedLocksData = useCallback(() => {
    if (!videoAllowedLocks.length || !effectiveSmartLocks.length) {
      return [];
    }
    const normalizedAllowedIds = new Set(
      videoAllowedLocks.map((id) => id.trim().toLowerCase())
    );
    return effectiveSmartLocks.filter((lock) => {
      const lockId = lock.device_id?.trim().toLowerCase() || '';
      return lockId !== '' && normalizedAllowedIds.has(lockId);
    });
  }, [videoAllowedLocks, effectiveSmartLocks]);

  const renderPinModalContent = () => {
    if (guestState.type === 'verifying_pin') {
      return (
        <PinInput
          onSubmit={handlePinSubmit}
          onCancel={handlePinModalClose}
          isLoading={true}
          propertyName={effectivePropertyName}
          propertyAddress={effectivePropertyAddress}
        />
      );
    }

    if (guestState.type === 'invalid_pin') {
      return (
        <PinInput
          onSubmit={handlePinSubmit}
          onCancel={handlePinModalClose}
          isLoading={false}
          errorMessage={guestState.message}
          propertyName={effectivePropertyName}
          propertyAddress={effectivePropertyAddress}
        />
      );
    }

    if (guestState.type === 'access_not_yet_active') {
      return (
        <PinInput
          onSubmit={handlePinSubmit}
          onCancel={handlePinModalClose}
          isLoading={false}
          errorMessage="Access not yet active"
          propertyName={effectivePropertyName}
          propertyAddress={effectivePropertyAddress}
        />
      );
    }

    if (guestState.type === 'access_expired') {
      return (
        <PinInput
          onSubmit={handlePinSubmit}
          onCancel={handlePinModalClose}
          isLoading={false}
          errorMessage="Access expired"
          propertyName={effectivePropertyName}
          propertyAddress={effectivePropertyAddress}
        />
      );
    }

    if (guestState.type === 'pin_verified') {
      const guestName = guestState.guest?.name;
      return (
        <PinVerifiedView
          guestName={guestName}
          onViewLocks={handleViewLocks}
          onCancel={handlePinModalClose}
        />
      );
    }

    return (
      <PinInput
        onSubmit={handlePinSubmit}
        onCancel={handlePinModalClose}
        isLoading={false}
        propertyName={effectivePropertyName}
        propertyAddress={effectivePropertyAddress}
      />
    );
  };

  if (isPropertyLoading) {
    return (
      <View style={styles.container}>
        <GuestStateMessage type="loading" />
      </View>
    );
  }

  if (guestState.type === 'system_error') {
    return (
      <View style={styles.container}>
        <GuestStateMessage type="system_error" message={guestState.message} />
        <TouchableOpacity style={styles.retryButton} onPress={resetGuestAccess}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (guestState.type === 'locks_loaded') {
    const { locks, guest, isMaster } = guestState;
    return (
      <LocksListView
        propertyName={effectivePropertyName}
        propertyAddress={effectivePropertyAddress}
        guestName={isMaster ? 'Owner' : guest?.name}
        locks={locks}
        onUnlock={handleUnlockDoor}
        onExit={handleExitProperty}
      />
    );
  }

  if (guestState.type === 'no_assigned_locks') {
    return (
      <View style={styles.container}>
        <GuestStateMessage type="no_locks" guestName={guestState.guest?.name} />
        <TouchableOpacity style={styles.exitButtonStandalone} onPress={handleExitProperty}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (guestState.type === 'no_locks_available') {
    return (
      <View style={styles.container}>
        <GuestStateMessage type="no_locks" />
        <TouchableOpacity style={styles.exitButtonStandalone} onPress={handleExitProperty}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showLocksFromVideo) {
    const videoLocks = getVideoAllowedLocksData();
    if (videoLocks.length === 0) {
      return (
        <View style={styles.container}>
          <GuestStateMessage type="no_locks" />
          <TouchableOpacity style={styles.exitButtonStandalone} onPress={handleExitProperty}>
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <LocksListView
        propertyName={effectivePropertyName}
        propertyAddress={effectivePropertyAddress}
        guestName="Guest"
        locks={videoLocks}
        onUnlock={handleUnlockDoor}
        onExit={handleExitProperty}
      />
    );
  }

  if (isDeclined) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingContainer}>
          <View style={styles.declinedIconContainer}>
            <CloseIcon size={80} color="white" />
          </View>
          <Text style={styles.waitingTitle}>Request Declined</Text>
          <Text style={styles.waitingText}>
            The property owner has declined your request at this time.
          </Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleRetake}>
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderCentralContent = () => {
    if (!isRecording && !isPreviewing && !guestId) {
      return (
        <>
          <View style={styles.infoContainer}>
            <View style={styles.houseIconContainer}>
              <House size={64} color="#e67e22" fill="#e67e22" />
            </View>
            <Text style={styles.houseName}>{effectivePropertyName}</Text>
            <Text style={styles.address}>{effectivePropertyAddress || 'No address available'}</Text>
          </View>

          {isWaiting ? (
            <View style={styles.waitingStatusContainer}>
              <ActivityIndicator size="small" color="#4ade80" />
              <Text style={styles.waitingStatusText}>Request Sent</Text>
              <Text style={styles.waitingStatusSubtext}>Waiting for owner...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.ringButtonCapsule} onPress={handleStartPreview}>
              <Text style={styles.ringButtonText}>Ring DoorBell</Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    if (isPreviewing || isRecording || showSendButton) {
      return (
        <View style={styles.cameraWrapper}>
          <View style={styles.cameraContainer}>
            {Platform.OS === 'web' ? (
              showSendButton && recordedVideoUrl ? (
                // REVIEW MODE: Playback recorded video
                <video
                  src={recordedVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  style={styles.webVideo as any}
                />
              ) : (
                // PREVIEW/RECORD MODE: Live Camera
                <video
                  autoPlay
                  muted
                  playsInline
                  style={styles.webVideo as any}
                  ref={(video) => {
                    if (video && (isPreviewing || isRecording)) {
                      // Only request stream if we are previewing or recording
                      navigator.mediaDevices
                        .getUserMedia({ video: { facingMode: 'user' }, audio: true })
                        .then((stream) => {
                          video.srcObject = stream;
                        })
                        .catch((err) => console.error('Camera preview error:', err));
                    }
                  }}
                />
              )
            ) : (
              <CameraView ref={cameraRef} style={styles.camera} facing="front" />
            )}
          </View>

          {/* Start Recording Button Overlay */}
          {isPreviewing && !isRecording && !showSendButton && (
            <TouchableOpacity
              style={[
                styles.startRecordingButtonOverlay,
                { backgroundColor: '#ef4444', borderColor: 'white' }
              ]}
              onPress={handleStartRecording}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'white' }} />
            </TouchableOpacity>
          )}

          {isPreviewing && !isRecording && !showSendButton && (
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity style={styles.ringButtonCapsule} onPress={handleStartRecording}>
                <Text style={styles.ringButtonText}>Start Recording</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {guestId ? (
        <View style={styles.guestIdBadge}>
          <Text style={styles.guestIdText}>Guest ID: {guestId}</Text>
        </View>
      ) : null}

      {renderCentralContent()}


      {
        isRecording && !showSendButton && (
          <View style={styles.recordingCounterContainer}>
            <Text style={styles.recordingCounter}>{recordingTime}</Text>
          </View>
        )
      }

      {
        showSendButton && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.retakeButton, isSending && styles.buttonDisabled]}
              onPress={handleRetake}
              disabled={isSending}
            >
              <RefreshCw size={16} color="#4ade80" />
              <Text style={styles.retakeText}>Retake Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, isSending && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={isSending}
            >
              <Send size={16} color="white" />
              <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        )
      }

      {
        !isRecording && !isPreviewing && !guestId && !isWaiting && (
          <View style={styles.footer}>
            <Text style={styles.disclaimer}>
              This triggers a 5-second front-camera{'\n'}recording which is sent to the owner.
            </Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => setIsPinModalVisible(true)}>
              <Text style={styles.linkText}>I have an access pin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                const apkUrl = 'application-3383c39d-4b0a-41ad-a70f-fb04b9626fb8';
                if (Platform.OS === 'web') {
                  const link = document.createElement('a');
                  link.href = apkUrl;
                  link.download = 'DoorbellApp_Guest.apk';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  Linking.openURL(apkUrl);
                }
              }}
            >
              <Text style={styles.downloadButtonText}>Download Android App</Text>
            </TouchableOpacity>
          </View>
        )
      }

      <Modal
        visible={isPinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handlePinModalClose}
      >
        <View style={styles.modalOverlay}>{renderPinModalContent()}</View>
      </Modal>
    </View >
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
  placeholderText: {
    color: 'white',
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
  cameraHintError: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 16,
  },
  cameraHintSuccess: {
    color: '#4ade80',
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
  buttonDisabled: {
    opacity: 0.5,
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
  downloadButton: {
    marginTop: 10,
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#666',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  declinedIconContainer: {
    marginBottom: 40,
    backgroundColor: '#ef4444',
    borderRadius: 50,
    padding: 20,
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
  tryAgainButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 280,
    justifyContent: 'center',
  },
  tryAgainButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    // @ts-ignore
    objectFit: 'cover',
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
  startRecordingButtonDisabled: {
    borderColor: 'red',
    opacity: 0.5,
  },
  recordButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff4444',
  },
  recordButtonInnerDisabled: {
    backgroundColor: '#555',
  },
  waitingStatusContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  retryButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginTop: 30,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exitButtonStandalone: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginTop: 30,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
