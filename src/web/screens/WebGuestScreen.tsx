import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { House, Send, RefreshCw, CircleCheckBig, X as CloseIcon } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type Property } from '@/types/Property';
import { addDoc, collection, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SmartLockItem, type LockState } from '@/components/SmartLockItem';

// TODO: Replace with your actual Cloudinary credentials
// See CLOUDINARY_SETUP.md for instructions
// TODO: Replace with your actual Cloudinary credentials
// See CLOUDINARY_SETUP.md for instructions
const CLOUDINARY_CLOUD_NAME = "ditqzfzbj";
const CLOUDINARY_UPLOAD_PRESET = "guest_doorbell_videos"; // Keep same preset or change if desired, strictly it's "guest_doorbell_photos" now but preset name doesn't matter if unsigned allows images.

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
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSendButton, setShowSendButton] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // -- PIN Access State --
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showLocks, setShowLocks] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

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
  // -- Refs --
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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



  // -- Handlers (Original) --
  // Removed video recording handlers

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
    setCapturedImage(null);
  };

  const handleTakePhoto = () => {
    if (Platform.OS === 'web' && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas'); // Create temp canvas or use ref
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        setShowSendButton(true);
        setIsPreviewing(false);

        // Stop stream tracks
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
    // Mobile logic would use cameraRef.current.takePictureAsync()
  };

  // Removed previous handleStartRecording in favor of split methods above, ensuring no duplicates.

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      if (!capturedImage) {
        alert('No photo found. Please retake.');
        setIsSending(false);
        return;
      }

      let downloadUrl = '';
      try {
        const formData = new FormData();
        formData.append('file', capturedImage); // Cloudinary accepts data URI directly
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('public_id', `guest_photos/${guestId}_${Date.now()}`);

        // Note: resource_type is 'image' for photos
        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        console.log('Starting photo upload to Cloudinary...');

        const uploadPromise = fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        const timeoutPromise = new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timed out. Check your Network.')), 20000)
        );

        const response = await Promise.race([uploadPromise, timeoutPromise]);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Cloudinary upload failed');
        }

        const data = await response.json();
        downloadUrl = data.secure_url;

        console.log('Cloudinary returned URI:', downloadUrl);
      } catch (uploadError: any) {
        console.error('Error uploading photo:', uploadError);
        alert(`Failed to upload photo. ${uploadError.message || ''}`);
        setIsSending(false);
        return;
      }

      const timestamp = new Date().toISOString();

      if (property.id) {
        const propertyRef = doc(db, 'properties', property.id);
        await updateDoc(propertyRef, {
          guestRequests: arrayUnion({
            uri: downloadUrl,
            guestId: guestId,
            createdAt: timestamp,
            type: 'image' // Helpful to distinguish
          })
        });
      }

      await addDoc(collection(db, 'guestRequests'), {
        guestId,
        propertyId: property.propertyId,
        propertyName: property.propertyName || 'Property',
        timestamp: timestamp,
        status: 'pending',
        userId: property.userId,
        photoUrl: downloadUrl, // Changed from videoUrl
        type: 'image'
      });

      setCapturedImage(null);
      setIsWaiting(true);
    } catch (error) {
      console.error('Error sending guest request:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsPreviewing(false);
    setShowSendButton(false);
    setGuestId('');
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

  // -- Render Logic --

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

  // 2. Waiting View
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

  // 3. Main View (Camera + Start)
  return (
    <View style={styles.container}>
      {guestId && (
        <View style={styles.guestIdBadge}>
          <Text style={styles.guestIdText}>Guest ID: {guestId}</Text>
        </View>
      )}

      {!isPreviewing && !guestId && (
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
        {isPreviewing || showSendButton ? (
          <View style={styles.cameraWrapper}>
            <View style={styles.cameraContainer}>
              {Platform.OS === 'web' ? (
                showSendButton && capturedImage ? (
                  // Review Mode
                  <img
                    src={capturedImage}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)' // Mirror toggle if standard selfie
                    }}
                  />
                ) : (
                  // Live Camera (Preview)
                  <video
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)'
                    }}
                    ref={(video) => {
                      // Attach ref
                      // @ts-ignore
                      videoRef.current = video;

                      if (video && isPreviewing) {
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

            {/* Take Photo Button Overlay */}
            {isPreviewing && (
              <TouchableOpacity style={styles.startRecordingButtonOverlay} onPress={handleTakePhoto}>
                <View style={styles.recordButtonInner} />
                {/* Could replace inner with Camera icon */}
              </TouchableOpacity>
            )}

            <Text style={styles.cameraHint}>Make sure your face is visible</Text>
          </View>
        ) : null}
      </View>



      {showSendButton && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <RefreshCw size={16} color="#4ade80" />
            <Text style={styles.retakeText}>Retake Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, isSending && { opacity: 0.7 }]}
            onPress={handleSend}
            disabled={isSending}
          >
            <Send size={16} color="white" />
            <Text style={styles.sendButtonText}>{isSending ? 'Processing...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isRecording && !isPreviewing && !guestId && (
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            This takes a quick photo/selfie{'\n'}which is sent to the owner.
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
});
