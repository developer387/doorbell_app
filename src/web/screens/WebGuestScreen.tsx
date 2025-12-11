import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Alert } from 'react-native';
import { House, Send, RefreshCw } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type Property } from '@/types/Property';
import { addDoc, collection, doc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
const generateGuestId = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};


type WebGuestScreenRouteProp = RouteProp<{ params: { property: Property } }, 'params'>;

export default function WebGuestScreen() {
  const route = useRoute<WebGuestScreenRouteProp>();
  const { property } = route.params;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [guestId, setGuestId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);

  // Call State
  // We removed the listener that checks for 'accepted' status + channelName
  // because we removed the Video Calling feature.
  // The user remains on "Waiting for call" screen indefinitely or until closed.
  const [requestId, setRequestId] = useState<string | null>(null);


  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

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

      mediaRecorder.onstop = () => {
        const type = selectedMimeType || 'video/webm';
        const videoBlob = new Blob(videoChunksRef.current, { type });
        const videoUrl = URL.createObjectURL(videoBlob);
        setRecordedVideo(videoUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error('Error starting web recording:', error);
      Alert.alert('Error', 'Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (Platform.OS === 'web' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setShowSendButton(true);
  };

  const handleStartRecording = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        alert("Camera permission is required to ring the doorbell.");
        return;
      }
    }
    const newGuestId = generateGuestId();
    setGuestId(newGuestId);
    setIsRecording(true);
    setRecordingTime(0);
    setShowSendButton(false);

    if (Platform.OS === 'web') {
      await startWebRecording();
    }
  };

  const handleSend = async () => {
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
          return;
        }
      }

      const docRef = await addDoc(collection(db, 'guestRequests'), {
        guestId,
        propertyId: property.propertyId,
        propertyName: property.propertyName || 'Property',
        timestamp: new Date().toISOString(),
        status: 'pending',
        userId: property.userId,
        videoUrl: downloadUrl,
      });

      setRequestId(docRef.id);
      setIsRecording(false);
      setIsWaiting(true);
    } catch (error) {
      console.error('Error sending guest request:', error);
      alert('Failed to send request. Please try again.');
    }
  };

  const handleRetake = () => {
    setIsRecording(false);
    setShowSendButton(false);
    setRecordingTime(0);
    setRecordedVideo(null);
  };



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

  return (
    <View style={styles.container}>
      {guestId && (
        <View style={styles.guestIdBadge}>
          <Text style={styles.guestIdText}>Guest ID: {guestId}</Text>
        </View>
      )}

      {!isRecording && !guestId && (
        <>
          <View style={styles.infoContainer}>
            <View style={styles.houseIconContainer}>
              <House size={64} color="#e67e22" fill="#e67e22" />
            </View>
            <Text style={styles.houseName}>{property.propertyName || 'Property'}</Text>
            <Text style={styles.address}>{property.address || 'No address available'}</Text>
          </View>

          <TouchableOpacity style={styles.ringButtonCapsule} onPress={handleStartRecording}>
            <Text style={styles.ringButtonText}>Ring DoorBell</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.centerContainer}>
        {isRecording || showSendButton ? (
          <View style={styles.cameraWrapper}>
            <View style={styles.cameraContainer}>
              {Platform.OS === 'web' ? (
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
                    if (video && isRecording) {
                      navigator.mediaDevices
                        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
                        .then((stream) => {
                          video.srcObject = stream;
                        });
                    }
                  }}
                />
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
              <View style={styles.flashIndicator}>
                <View style={styles.flashIcon}>
                  <Text style={styles.flashIconText}>⚡</Text>
                </View>
              </View>
            </View>
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
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <RefreshCw size={16} color="#4ade80" />
            <Text style={styles.retakeText}>Retake Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Send size={16} color="white" />
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && !guestId && (
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            This triggers a 5-second front-camera{'\n'}recording which is sent to the owner.
          </Text>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>I have the property code</Text>
          </TouchableOpacity>
        </View>
      )}
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
    gap: 16,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  retakeText: {
    color: '#4ade80',
    fontSize: 16,
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
  waitingSpinner: {
    fontSize: 16,
  },
  remoteVideoContainer: {
    width: 320,
    height: 240,
    backgroundColor: 'black',
    borderRadius: 12,
    overflow: 'hidden',
  },
  remoteVideoPlaceholder: {
    width: 320,
    height: 240,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
  },
  localVideoContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'black',
  },
  videoFill: {
    width: '100%',
    height: '100%',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
  },
  endCallText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
