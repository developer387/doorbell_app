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
import { House, Send, RefreshCw, X as CloseIcon } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type Property } from '@/types/Property';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { PropertyService } from '@/services/property.service';
import { seamService } from '@/services/seam.service';
import { useGuestAccess } from '@/hooks/guest';
import {
  PinInput,
  PinVerifiedView,
  GuestStateMessage,
  LocksListView,
} from '../components/guest';
import { 
  VideoUploadErrorHandler, 
  DatabaseErrorHandler, 
  ValidationUtils, 
  ErrorLogger, 
  RetryUtils,
  VideoRequestError 
} from '@/utils/errorHandling';

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
  const [showLocksFromVideo, setShowLocksFromVideo] = useState(false);
  const [videoAllowedLocks, setVideoAllowedLocks] = useState<string[]>([]);
  const [isListenerConnected, setIsListenerConnected] = useState(true);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [showAcceptedMessage, setShowAcceptedMessage] = useState(false);

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
    // Use the Firestore document ID consistently - prioritize propertyData over initialProperty
    const targetDocId = propertyData?.id || initialProperty.id;

    if (!requestDocId || !targetDocId) return;

    console.log('Setting up real-time listener for request:', requestDocId, 'in property:', targetDocId);
    setIsListenerConnected(true);
    setListenerError(null);

    const unsubscribe = onSnapshot(
      doc(db, 'properties', targetDocId, 'guestRequests', requestDocId),
      (snapshot) => {
        // Connection is working
        setIsListenerConnected(true);
        setListenerError(null);
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log('Real-time update received for request:', requestDocId, 'status:', data?.status);
          
          if (data?.status === 'declined') {
            console.log('Request declined, updating UI state');
            setIsDeclined(true);
            setIsWaiting(false);
          } else if (data?.status === 'accepted') {
            console.log('Request accepted, updating UI state');
            setIsWaiting(false);
            setShowAcceptedMessage(true);
            
            // Show accepted message for 2 seconds, then show locks
            setTimeout(() => {
              setShowAcceptedMessage(false);
              if (data.allowedLocks && Array.isArray(data.allowedLocks)) {
                setVideoAllowedLocks(data.allowedLocks);
                setShowLocksFromVideo(true);
              } else {
                // Handle case where request is accepted but no locks are specified
                console.warn('Request accepted but no allowed locks specified');
                setVideoAllowedLocks([]);
                setShowLocksFromVideo(true);
              }
            }, 2000);
          } else if (data?.status === 'pending') {
            // Ensure we stay in waiting state for pending requests
            console.log('Request still pending, maintaining waiting state');
            setIsWaiting(true);
            setIsDeclined(false);
            setShowLocksFromVideo(false);
          }
        } else {
          console.warn('Request document no longer exists:', requestDocId);
          // Handle case where request document was deleted
          setIsWaiting(false);
          setIsDeclined(false);
          setShowLocksFromVideo(false);
        }
      },
      (error) => {
        console.error('Real-time listener error for request:', requestDocId, error);
        setIsListenerConnected(false);
        setListenerError(error.message || 'Connection error');
        // Handle listener errors gracefully - don't break the UI
        // Could show a reconnection message or retry logic here
      }
    );

    return () => {
      console.log('Cleaning up real-time listener for request:', requestDocId);
      unsubscribe();
    };
  }, [requestDocId, initialProperty.id, propertyData?.id]);

  const handleStartPreview = async () => {
    // Validate camera permissions
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to ring the doorbell.');
        return;
      }
    }

    // Validate property information before proceeding
    const targetPropertyDocId = propertyData?.id || initialProperty.id;
    const targetUserId = initialProperty.userId;
    const propertyName = propertyData?.propertyName || initialProperty.propertyName;

    // Basic property validation
    if (!targetPropertyDocId) {
      Alert.alert('Property Error', 'Property information not available. Please scan the QR code again.');
      return;
    }

    if (!targetUserId) {
      Alert.alert('Property Error', 'Property owner information not available. Please scan the QR code again.');
      return;
    }

    if (!propertyName || propertyName.trim().length === 0) {
      Alert.alert('Property Error', 'Property name not available. Please scan the QR code again.');
      return;
    }

    // Validate property document ID format
    const propertyDocValidation = ValidationUtils.validatePropertyDocumentId(targetPropertyDocId);
    if (!propertyDocValidation.isValid) {
      ErrorLogger.logError(new Error(`Invalid property document ID: ${propertyDocValidation.error}`), {
        operation: 'handleStartPreview',
        additionalData: { step: 'property_validation', propertyDocId: targetPropertyDocId }
      });
      Alert.alert('Property Error', 'Invalid property information. Please scan the QR code again.');
      return;
    }

    // Validate user ID format
    const userIdValidation = ValidationUtils.validateUserId(targetUserId);
    if (!userIdValidation.isValid) {
      ErrorLogger.logError(new Error(`Invalid user ID: ${userIdValidation.error}`), {
        operation: 'handleStartPreview',
        additionalData: { step: 'user_id_validation', userId: targetUserId }
      });
      Alert.alert('Property Error', 'Invalid property owner information. Please scan the QR code again.');
      return;
    }

    // Validate property name
    const propertyNameValidation = ValidationUtils.validatePropertyName(propertyName);
    if (!propertyNameValidation.isValid) {
      ErrorLogger.logError(new Error(`Invalid property name: ${propertyNameValidation.error}`), {
        operation: 'handleStartPreview',
        additionalData: { step: 'property_name_validation', propertyName }
      });
      Alert.alert('Property Error', 'Invalid property name. Please scan the QR code again.');
      return;
    }

    const newGuestId = generateGuestId();
    
    // Validate generated guest ID
    const guestIdValidation = ValidationUtils.validateGuestId(newGuestId);
    if (!guestIdValidation.isValid) {
      ErrorLogger.logError(new Error(`Generated invalid guest ID: ${guestIdValidation.error}`), {
        operation: 'handleStartPreview',
        additionalData: { step: 'guest_id_generation', generatedId: newGuestId }
      });
      Alert.alert('System Error', 'Failed to generate guest ID. Please try again.');
      return;
    }

    setGuestId(newGuestId);
    setIsPreviewing(true);
    setRecordedVideoUrl(null);
    setHasFace(false);

    if (Platform.OS === 'web') {
      setHasFace(true);
    }
  };

  const handleStartRecording = async () => {
    // Validate face detection
    if (!hasFace) {
      Alert.alert('Face Required', 'Please ensure your face is clearly visible.');
      return;
    }

    // Validate guest ID is present
    if (!guestId || guestId.trim().length === 0) {
      Alert.alert('System Error', 'Guest ID not generated. Please try again.');
      return;
    }

    // Validate guest ID format
    const guestIdValidation = ValidationUtils.validateGuestId(guestId);
    if (!guestIdValidation.isValid) {
      ErrorLogger.logError(new Error(`Invalid guest ID: ${guestIdValidation.error}`), {
        operation: 'handleStartRecording',
        guestId,
        additionalData: { step: 'guest_id_validation' }
      });
      Alert.alert('System Error', 'Invalid guest ID format. Please try again.');
      return;
    }

    // Validate property information is available
    const targetPropertyDocId = propertyData?.id || initialProperty.id;
    if (!targetPropertyDocId) {
      Alert.alert('Property Error', 'Property information not available. Please scan the QR code again.');
      return;
    }

    const propertyDocValidation = ValidationUtils.validatePropertyDocumentId(targetPropertyDocId);
    if (!propertyDocValidation.isValid) {
      ErrorLogger.logError(new Error(`Invalid property document ID: ${propertyDocValidation.error}`), {
        operation: 'handleStartRecording',
        guestId,
        additionalData: { step: 'property_validation', propertyDocId: targetPropertyDocId }
      });
      Alert.alert('Property Error', 'Invalid property information. Please scan the QR code again.');
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
    setIsWaiting(false);
    setIsListenerConnected(true);
    setListenerError(null);
    setShowAcceptedMessage(false);
  };

  const handleSend = async () => {
    setIsSending(true);
    
    try {
      // Comprehensive input validation before proceeding
      const targetPropertyDocId = propertyData?.id || initialProperty.id;
      const targetUserId = initialProperty.userId;
      const businessPropertyId = initialProperty.propertyId || targetPropertyDocId;
      const propertyName = propertyData?.propertyName || initialProperty.propertyName || 'Property';

      // Create video blob for validation
      let videoBlob: Blob | undefined;
      if (videoChunksRef.current.length > 0) {
        const blobType = videoChunksRef.current[0]?.type || 'video/webm';
        videoBlob = new Blob(videoChunksRef.current, { type: blobType });
      }

      // Pre-flight validation with network check
      const preFlightValidation = await ValidationUtils.validatePreFlightChecks({
        guestId,
        propertyDocId: targetPropertyDocId,
        propertyName,
        userId: targetUserId,
        videoBlob,
        checkNetwork: true
      });

      if (!preFlightValidation.isValid) {
        const errorMessage = preFlightValidation.errors.join('\n');
        ErrorLogger.logError(new Error(`Pre-flight validation failed: ${errorMessage}`), {
          operation: 'handleSend',
          guestId,
          additionalData: { 
            step: 'pre_flight_validation', 
            errors: preFlightValidation.errors,
            warnings: preFlightValidation.warnings
          }
        });
        Alert.alert('Validation Error', `Please correct the following issues:\n\n${errorMessage}`);
        return;
      }

      // Show warnings if any (but don't block the operation)
      if (preFlightValidation.warnings.length > 0) {
        console.warn('Pre-flight validation warnings:', preFlightValidation.warnings);
      }

      // Comprehensive validation of all inputs
      const inputValidation = ValidationUtils.validateRequestCreationInputs({
        guestId,
        propertyDocId: targetPropertyDocId,
        propertyName,
        userId: targetUserId,
        videoUrl: '', // Will be set after upload
        videoBlob
      });

      if (!inputValidation.isValid) {
        const errorMessage = inputValidation.errors.join('\n');
        ErrorLogger.logError(new Error(`Input validation failed: ${errorMessage}`), {
          operation: 'handleSend',
          guestId,
          additionalData: { step: 'input_validation', errors: inputValidation.errors }
        });
        Alert.alert('Validation Error', `Please correct the following issues:\n\n${errorMessage}`);
        return;
      }

      const sanitizedInputs = inputValidation.sanitizedInputs!;

      let downloadUrl = '';
      
      // Video upload with comprehensive error handling
      if (videoBlob) {
        // Additional video format validation
        const extension = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const formatValidation = ValidationUtils.validateVideoFormat(videoBlob, extension);
        
        if (!formatValidation.isValid) {
          ErrorLogger.logError(new Error(`Video format validation failed: ${formatValidation.error}`), {
            operation: 'handleSend',
            guestId: sanitizedInputs.guestId,
            additionalData: { step: 'video_format_validation', blobType: videoBlob.type, blobSize: videoBlob.size }
          });
          Alert.alert('Video Format Error', formatValidation.error!);
          return;
        }

        try {
          // Upload with retry logic
          downloadUrl = await RetryUtils.withRetry(
            async () => {
              const videoRef = ref(storage, `guest-videos/${sanitizedInputs.guestId}.${extension}`);
              await uploadBytes(videoRef, videoBlob!);
              const url = await getDownloadURL(videoRef);
              
              // Validate that we got a valid download URL
              if (!url || !url.startsWith('https://')) {
                throw new Error('Invalid video URL received from storage');
              }
              
              return url;
            },
            {
              maxAttempts: 3,
              baseDelay: 2000,
              maxDelay: 10000,
              retryCondition: (error) => {
                // Retry on network errors and some storage errors
                return error.code === 'storage/retry-limit-exceeded' ||
                       error.code === 'storage/unknown' ||
                       error.message?.includes('network');
              }
            }
          );
        } catch (uploadError: any) {
          const handledError = VideoUploadErrorHandler.handleError(uploadError);
          ErrorLogger.logError(handledError, {
            operation: 'handleSend',
            guestId: sanitizedInputs.guestId,
            additionalData: { step: 'video_upload', blobSize: videoBlob.size }
          });
          Alert.alert('Upload Error', handledError.userMessage);
          return;
        }
      } else {
        Alert.alert('Recording Error', 'No video recorded. Please record a video first.');
        return;
      }

      // Prepare and validate final request data
      const currentTimestamp = new Date().toISOString();
      const requestData = {
        guestId: sanitizedInputs.guestId,
        propertyId: businessPropertyId,
        propertyDocId: sanitizedInputs.propertyDocId,
        propertyName: sanitizedInputs.propertyName,
        timestamp: currentTimestamp,
        status: 'pending' as const,
        userId: sanitizedInputs.userId,
        videoUrl: downloadUrl,
      };

      // Validate timestamp
      const timestampValidation = ValidationUtils.validateTimestamp(currentTimestamp);
      if (!timestampValidation.isValid) {
        const error = new Error(`Timestamp validation failed: ${timestampValidation.error}`);
        ErrorLogger.logError(error, {
          operation: 'handleSend',
          guestId: sanitizedInputs.guestId,
          additionalData: { step: 'timestamp_validation', timestamp: currentTimestamp }
        });
        Alert.alert('System Error', 'System time validation failed. Please check your device clock.');
        return;
      }

      // Final validation of complete request data
      const requestValidation = ValidationUtils.validateGuestRequestData(requestData);
      if (!requestValidation.isValid) {
        const error = new Error(`Request validation failed: ${requestValidation.errors.join(', ')}`);
        ErrorLogger.logError(error, {
          operation: 'handleSend',
          guestId: sanitizedInputs.guestId,
          propertyId: sanitizedInputs.propertyDocId,
          additionalData: { step: 'final_request_validation', errors: requestValidation.errors }
        });
        Alert.alert('Validation Error', 'Request data is invalid. Please try again.');
        return;
      }

      try {
        // Create request with retry logic
        const docRef = await RetryUtils.withRetry(
          () => addDoc(collection(db, 'properties', sanitizedInputs.propertyDocId, 'guestRequests'), requestData),
          {
            maxAttempts: 3,
            baseDelay: 1000,
            retryCondition: (error) => {
              // Retry on network errors but not on permission/validation errors
              return error.code === 'unavailable' || 
                     error.code === 'deadline-exceeded' ||
                     error.message?.includes('network');
            }
          }
        );
        
        if (!docRef.id) {
          throw new Error('Failed to create request document');
        }
        
        setRequestDocId(docRef.id);

        // Update property pending status with error handling
        try {
          await PropertyService.updatePendingRequestStatus(sanitizedInputs.propertyDocId, true);
        } catch (statusError: any) {
          // Log the error but don't fail the entire operation
          ErrorLogger.logError(statusError, {
            operation: 'handleSend',
            guestId: sanitizedInputs.guestId,
            propertyId: sanitizedInputs.propertyDocId,
            additionalData: { step: 'property_status_update' }
          });
          console.warn('Failed to update property pending status, but request was created successfully');
        }

        // Success - update UI state
        setIsRecording(false);
        setIsWaiting(true);
        setShowSendButton(false);
        
        console.log(`Successfully created guest request ${docRef.id} for property ${sanitizedInputs.propertyDocId}`);
        
      } catch (dbError: any) {
        const handledError = DatabaseErrorHandler.handleError(dbError, 'create_guest_request');
        ErrorLogger.logError(handledError, {
          operation: 'handleSend',
          guestId: sanitizedInputs.guestId,
          propertyId: sanitizedInputs.propertyDocId,
          userId: sanitizedInputs.userId,
          additionalData: { step: 'database_operation' }
        });
        Alert.alert('Request Error', handledError.userMessage);
        return;
      }
      
    } catch (error: any) {
      // Handle any unexpected errors
      const errorMessage = error instanceof VideoRequestError 
        ? error.userMessage 
        : 'An unexpected error occurred. Please try again.';
        
      ErrorLogger.logError(error, {
        operation: 'handleSend',
        guestId,
        additionalData: { step: 'unexpected_error' }
      });
      
      Alert.alert('Unexpected Error', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

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
    setShowAcceptedMessage(false);
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

  if (showAcceptedMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingContainer}>
          <View style={styles.acceptedIconContainer}>
            <Text style={styles.acceptedIcon}>✓</Text>
          </View>
          <Text style={styles.waitingTitle}>Request Accepted!</Text>
          <Text style={styles.waitingText}>
            The property owner has approved your request.
            {'\n\n'}Preparing access to available locks...
          </Text>
        </View>
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
            {'\n\n'}You can try again with a new video message.
          </Text>
          <View style={styles.declinedActionsContainer}>
            <TouchableOpacity style={styles.tryAgainButton} onPress={handleRetake}>
              <RefreshCw size={16} color="white" />
              <Text style={styles.tryAgainButtonText}>Record New Video</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.pinAccessButton} 
              onPress={() => setIsPinModalVisible(true)}
            >
              <Text style={styles.pinAccessButtonText}>I have an access pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {guestId ? (
        <View style={styles.guestIdBadge}>
          <Text style={styles.guestIdText}>Guest ID: {guestId}</Text>
        </View>
      ) : null}

      {!isRecording && !isPreviewing && !guestId && (
        <>
          <View style={styles.infoContainer}>
            <View style={styles.houseIconContainer}>
              <House size={64} color="#e67e22" fill="#e67e22" />
            </View>
            <Text style={styles.houseName}>{effectivePropertyName}</Text>
            <Text style={styles.address}>{effectivePropertyAddress || 'No address available'}</Text>
          </View>

          {isWaiting ? (
            <View style={styles.waitingFullContainer}>
              <View style={styles.waitingStatusContainer}>
                <ActivityIndicator size="large" color="#4ade80" />
                <Text style={styles.waitingStatusText}>Request Sent</Text>
                <Text style={styles.waitingStatusSubtext}>
                  {!isListenerConnected && listenerError 
                    ? 'Connection issue - retrying...' 
                    : 'Waiting for owner response...'}
                </Text>
                {!isListenerConnected && (
                  <Text style={styles.connectionErrorText}>
                    {listenerError || 'Connection lost'}
                  </Text>
                )}
              </View>
              <View style={styles.waitingActionsContainer}>
                <Text style={styles.waitingHelpText}>
                  The property owner will see your video message and respond shortly.
                </Text>
                <TouchableOpacity 
                  style={styles.cancelWaitingButton} 
                  onPress={handleRetake}
                >
                  <Text style={styles.cancelWaitingButtonText}>Cancel & Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.ringButtonCapsule} onPress={handleStartPreview}>
              <Text style={styles.ringButtonText}>Ring DoorBell</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={styles.centerContainer}>
        {isPreviewing || isRecording || showSendButton ? (
          <View style={styles.cameraWrapper}>
            <View style={styles.cameraContainer}>
              {Platform.OS === 'web' ? (
                showSendButton && recordedVideoUrl ? (
                  <video
                    src={recordedVideoUrl}
                    controls
                    playsInline
                    style={styles.webVideo as any}
                  />
                ) : (
                  <video
                    autoPlay
                    muted
                    playsInline
                    style={styles.webVideo as any}
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
                <CameraView ref={cameraRef} style={styles.camera} facing="front" />
              ) : (
                <View style={styles.recordingPlaceholder}>
                  <Text style={styles.placeholderText}>Camera Preview...</Text>
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

            {isPreviewing && (
              <TouchableOpacity
                style={[
                  styles.startRecordingButtonOverlay,
                  !hasFace && styles.startRecordingButtonDisabled,
                ]}
                onPress={handleStartRecording}
              >
                <View
                  style={[styles.recordButtonInner, !hasFace && styles.recordButtonInnerDisabled]}
                />
              </TouchableOpacity>
            )}

            {isPreviewing && !hasFace && (
              <Text style={styles.cameraHintError}>
                {Platform.OS === 'web' ? 'Face check simulated (Web)' : 'No Face Detected'}
              </Text>
            )}

            {isPreviewing && hasFace && (
              <Text style={styles.cameraHintSuccess}>Face Detected</Text>
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
      )}

      {!isRecording && !isPreviewing && !guestId && !isWaiting && (
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
      )}

      <Modal
        visible={isPinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handlePinModalClose}
      >
        <View style={styles.modalOverlay}>{renderPinModalContent()}</View>
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
  acceptedIconContainer: {
    marginBottom: 40,
    backgroundColor: '#4ade80',
    borderRadius: 50,
    padding: 20,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptedIcon: {
    fontSize: 60,
    color: 'white',
    fontWeight: 'bold',
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
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 280,
    justifyContent: 'center',
    marginBottom: 16,
  },
  tryAgainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  declinedActionsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pinAccessButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
  },
  pinAccessButtonText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '500',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  waitingFullContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingActionsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  waitingHelpText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    maxWidth: 280,
  },
  cancelWaitingButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelWaitingButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
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
  connectionErrorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
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
