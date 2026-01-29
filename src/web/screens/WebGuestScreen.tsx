import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Animated } from 'react-native';
import { useGuestRequest } from '../../shared/hooks/useGuestRequest';
import { useWebRTC } from '../../shared/hooks/useWebRTC';
import { db } from '../../shared/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';
import { PinInput } from '../components/guest/PinInput';
import { Bell, House, Camera, Mic } from 'lucide-react-native';

export default function WebGuestScreen() {
  const route = useRoute<any>();
  const initialProperty = route.params?.property;
  // Ensure propertyId can be accessed safely
  const propertyId = initialProperty?.id;
  const propertyName = initialProperty?.propertyName || 'Doorbell';
  const propertyAddress = initialProperty?.address || '';

  const [requestId, setRequestId] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'failed' | 'timeout'>('idle');
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'prompt' | 'granted' | 'denied'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Refs for tracking state
  const answerProcessed = useRef(false);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedCandidatesLocal = useRef<Set<string>>(new Set());

  // Animation for the ring button ripple effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Hooks for Signaling and WebRTC
  const { request, addIceCandidate, setStatus } = useGuestRequest(requestId);
  // Only init WebRTC if on mobile/web appropriately
  const { pc, init, addLocalTracks, remoteStream, localStream, connectionState, addRemoteIceCandidate } = useWebRTC(Platform.OS !== 'web');

  useEffect(() => {
    if (!propertyId) {
      console.warn("No property ID found in route params");
    }
  }, [propertyId]);

  // Check if camera/mic permissions are available
  const checkPermissions = async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (Platform.OS !== 'web') return 'granted';

    try {
      // Try to query permission status (not all browsers support this)
      if (navigator.permissions && navigator.permissions.query) {
        const [cameraResult, micResult] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName })
        ]);

        if (cameraResult.state === 'denied' || micResult.state === 'denied') {
          return 'denied';
        }
        if (cameraResult.state === 'granted' && micResult.state === 'granted') {
          return 'granted';
        }
        return 'prompt';
      }
      // If permissions API not supported, assume we need to prompt
      return 'prompt';
    } catch (e) {
      console.log('[Permissions] Query not supported, will prompt');
      return 'prompt';
    }
  };

  // Request camera and microphone permissions
  const requestPermissions = async (): Promise<boolean> => {
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop the tracks immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      setIsRequestingPermission(false);
      return true;
    } catch (err: any) {
      console.error('[Permissions] Error requesting permissions:', err);
      setIsRequestingPermission(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
      } else if (err.name === 'NotFoundError') {
        alert('No camera or microphone found. Please connect a camera and microphone to use video calling.');
      } else {
        alert('Could not access camera/microphone. Please check your device settings.');
      }
      return false;
    }
  };

  // 1. Ring Doorbell -> Check permissions first, then start call
  const ringDoorbell = async () => {
    if (!propertyId) {
      alert("Missing Property ID");
      return;
    }

    // Check permissions first
    const currentPermission = await checkPermissions();

    if (currentPermission === 'denied') {
      setPermissionStatus('denied');
      return;
    }

    if (currentPermission === 'prompt') {
      setPermissionStatus('prompt');
      return;
    }

    // Permissions granted, proceed with call
    await startCall();
  };

  // Actually start the video call (after permissions granted)
  const startCall = async () => {
    try {
      // A. Init WebRTC
      await init();
      await addLocalTracks();

      // B. Create Offer
      const offer = await pc.current?.createOffer();
      if (!offer) throw new Error("Failed to create offer");
      await pc.current?.setLocalDescription(offer);

      // C. Update Database (No Recording, Just Scaling Call)
      const docRef = await addDoc(collection(db, 'guestRequests'), {
        propertyId: propertyId,
        status: 'calling',
        callOffer: offer,
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      setRequestId(docRef.id);
      setCallStatus('calling');
      answerProcessed.current = false;
      processedCandidatesLocal.current.clear();

      // Set up call timeout (60 seconds)
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          console.log('[Guest] Call timeout - no answer');
          setCallStatus('timeout');
          setStatus('timeout');
        }
      }, 60000);
    } catch (err: any) {
      console.error("Failed to start call", err);
      setCallStatus('failed');

      // Provide more specific error messages
      if (err.name === 'NotAllowedError') {
        setPermissionStatus('denied');
      } else if (err.name === 'NotFoundError') {
        alert('No camera or microphone found. Please connect a camera and microphone.');
      } else {
        alert('Could not start video call. Please try again.');
      }
    }
  };

  // Handle permission request from prompt UI
  const handleRequestPermission = async () => {
    const granted = await requestPermissions();
    if (granted) {
      // Permissions granted, start the call
      await startCall();
    }
  };

  // Cleanup timeout on unmount or call end
  useEffect(() => {
    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
  }, []);

  const handlePinSubmit = async (pin: string) => {
    setIsVerifyingPin(true);
    setTimeout(() => {
      setIsVerifyingPin(false);
      alert(`PIN ${pin} entered. Verification logic pending.`);
      setShowPinInput(false);
    }, 1000);
  };

  // 2. Handle Answer from Owner (with race condition prevention)
  useEffect(() => {
    if (request?.status === 'calling' && request.callAnswer && !answerProcessed.current) {
      handleCallAnswer(request.callAnswer);
    }
  }, [request?.callAnswer]);

  const handleCallAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (answerProcessed.current) {
      console.log('[Guest] Answer already processed, skipping');
      return;
    }

    try {
      console.log('[Guest] Processing call answer');
      answerProcessed.current = true;
      await pc.current?.setRemoteDescription(answer);

      // Clear timeout since call was answered
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (e) {
      console.error("Error setting remote description", e);
      answerProcessed.current = false; // Allow retry on error
    }
  };

  // 2b. Update call status based on connection state
  useEffect(() => {
    if (connectionState === 'connected') {
      setCallStatus('connected');
    } else if (connectionState === 'failed' || connectionState === 'disconnected') {
      setCallStatus('failed');
    }
  }, [connectionState]);

  // 3. Send local ICE candidates to Firestore
  useEffect(() => {
    if (!pc.current || !requestId) return;

    const onIce = (e: any) => {
      if (e.candidate) {
        console.log('[Guest] Sending ICE candidate');
        addIceCandidate(e.candidate.toJSON(), 'guest');
      }
    };
    pc.current.onicecandidate = onIce;
  }, [pc.current, requestId, addIceCandidate]);

  // 3b. Receive remote ICE candidates (separate effect with deduplication)
  useEffect(() => {
    if (!pc.current || !request?.iceCandidates) return;

    request.iceCandidates.forEach((c) => {
      if (c.from === 'owner') {
        const candidateId = JSON.stringify(c.candidate);
        if (!processedCandidatesLocal.current.has(candidateId)) {
          processedCandidatesLocal.current.add(candidateId);
          addRemoteIceCandidate(c.candidate);
        }
      }
    });
  }, [request?.iceCandidates, addRemoteIceCandidate]);

  if (showPinInput) {
    return (
      <View style={styles.container}>
        <PinInput
          onSubmit={handlePinSubmit}
          onCancel={() => setShowPinInput(false)}
          isLoading={isVerifyingPin}
          propertyName={propertyName}
          propertyAddress={propertyAddress}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* State: Permission Prompt */}
      {permissionStatus === 'prompt' && !requestId && (
        <View style={styles.contentWrapper}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconRow}>
              <View style={styles.permissionIcon}>
                <Camera size={32} color="#10b981" />
              </View>
              <View style={styles.permissionIcon}>
                <Mic size={32} color="#10b981" />
              </View>
            </View>
            <Text style={styles.permissionTitle}>Camera & Microphone Access</Text>
            <Text style={styles.permissionText}>
              To ring the doorbell and have a video call with the property owner, we need access to your camera and microphone.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleRequestPermission}
              disabled={isRequestingPermission}
            >
              {isRequestingPermission ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.permissionButtonText}>Allow Access</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.permissionCancelButton}
              onPress={() => setPermissionStatus('unknown')}
            >
              <Text style={styles.permissionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* State: Permission Denied */}
      {permissionStatus === 'denied' && !requestId && (
        <View style={styles.contentWrapper}>
          <View style={styles.permissionCard}>
            <View style={[styles.permissionIconRow, { marginBottom: 16 }]}>
              <View style={[styles.permissionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Camera size={32} color="#ef4444" />
              </View>
            </View>
            <Text style={styles.permissionTitle}>Permission Required</Text>
            <Text style={styles.permissionText}>
              Camera and microphone access was denied. To use the video doorbell, please enable permissions in your browser settings:
            </Text>
            <View style={styles.permissionSteps}>
              <Text style={styles.permissionStep}>1. Click the lock/info icon in your browser's address bar</Text>
              <Text style={styles.permissionStep}>2. Find Camera and Microphone permissions</Text>
              <Text style={styles.permissionStep}>3. Change both to "Allow"</Text>
              <Text style={styles.permissionStep}>4. Refresh this page</Text>
            </View>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => window.location.reload()}
            >
              <Text style={styles.permissionButtonText}>Refresh Page</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.permissionCancelButton}
              onPress={() => setPermissionStatus('unknown')}
            >
              <Text style={styles.permissionCancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* State: Idle (Not Ringing) */}
      {!requestId && permissionStatus !== 'prompt' && permissionStatus !== 'denied' && (
        <View style={styles.contentWrapper}>

          {/* 1. House Icon / Avatar */}
          <View style={styles.iconWrapper}>
            <House size={64} color="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
          </View>

          {/* 2. Property Info */}
          <View style={styles.textWrapper}>
            <Text style={styles.propertyTitle}>{propertyName}</Text>
            {propertyAddress ? <Text style={styles.propertyAddress}>{propertyAddress}</Text> : null}
          </View>

          {/* 3. Main Action: Ring Doorbell */}
          <View style={styles.ringButtonContainer}>
            {/* Ripple Effect Background */}
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: 0.3 }]} />
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: 0.1, width: 220, height: 220 }]} />

            <TouchableOpacity style={styles.ringButton} onPress={ringDoorbell} activeOpacity={0.8}>
              <Bell size={64} color="#fff" fill="#fff" />
              <Text style={styles.ringButtonText}>Ring Doorbell</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Secondary Action: Pin */}
          <View style={styles.footerAction}>
            <TouchableOpacity onPress={() => setShowPinInput(true)}>
              <Text style={styles.linkText}>I have an Access PIN</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

      {/* State: Calling / Connected / Failed / Timeout */}
      {requestId && (
        <View style={styles.statusContainer}>
          {/* Status display with connection state */}
          <View style={styles.statusHeader}>
            <Text style={[
              styles.statusText,
              callStatus === 'connected' && { color: '#4ade80' },
              callStatus === 'failed' && { color: '#ef4444' },
              callStatus === 'timeout' && { color: '#f59e0b' }
            ]}>
              {callStatus === 'calling' && 'Calling Owner...'}
              {callStatus === 'connected' && 'Connected'}
              {callStatus === 'failed' && 'Connection Failed'}
              {callStatus === 'timeout' && 'No Answer'}
            </Text>
            {callStatus === 'calling' && (
              <Text style={styles.connectionStateText}>
                {connectionState === 'connecting' ? 'Establishing connection...' : ''}
              </Text>
            )}
          </View>

          {/* Timeout/Failed state - show retry option */}
          {(callStatus === 'timeout' || callStatus === 'failed') && (
            <View style={styles.retryContainer}>
              <Text style={styles.retryText}>
                {callStatus === 'timeout' ? 'The owner didn\'t answer.' : 'The connection failed.'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setRequestId('');
                  setCallStatus('idle');
                  answerProcessed.current = false;
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Video grid - only show when not timeout/failed */}
          {callStatus !== 'timeout' && callStatus !== 'failed' && (
            <View style={styles.videoGrid}>
              {/* Remote Video (Owner) */}
              <View style={styles.remoteVideo}>
                {remoteStream ? (
                  Platform.OS === 'web' ? (
                    <video
                      ref={v => { if (v) v.srcObject = remoteStream }}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : <Text style={{ color: '#fff' }}>Mobile Video View</Text>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: '#ccc', marginTop: 10 }}>Waiting for owner...</Text>
                  </View>
                )}
              </View>

              {/* Local Video (Self View) */}
              <View style={styles.localVideo}>
                {localStream && (
                  Platform.OS === 'web' ? (
                    <video
                      ref={v => { if (v) { v.srcObject = localStream; v.muted = true; } }}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : <Text style={{ color: '#fff' }}>Local</Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b', // zinc-900 
    alignItems: 'center',
    justifyContent: 'center'
  },
  contentWrapper: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 20
  },

  // Icon Section
  iconWrapper: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // amber with opacity
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)'
  },

  // Text Section
  textWrapper: {
    alignItems: 'center',
    marginBottom: 60
  },
  propertyTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5
  },
  propertyAddress: {
    fontSize: 16,
    color: '#a1a1aa', // zinc-400
    textAlign: 'center',
    lineHeight: 24
  },

  // Ring Button Section
  ringButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80,
    position: 'relative',
    height: 200,
    width: 200
  },
  pulseCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 100,
    backgroundColor: '#10b981', // emerald-500 (A nice green ring color)
    zIndex: 0
  },
  ringButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glassmorphic
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981', // emerald-500 border
    zIndex: 1,
    shadowColor: '#10b981',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10
  },
  ringButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },

  // Footer Actions
  footerAction: {
    position: 'absolute',
    bottom: -60 // Adjust based on screen height usually, but flex container handles it. 
    // In this flow, we'll rely on margin since we are in a centered view.
  },
  linkText: {
    color: '#10b981', // Link color
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },

  // Calling States
  statusContainer: { alignItems: 'center', width: '100%', flex: 1, padding: 20 },
  statusHeader: { alignItems: 'center', marginBottom: 20 },
  statusText: { color: '#4ade80', fontSize: 20, fontWeight: 'bold' },
  connectionStateText: { color: '#888', fontSize: 14, marginTop: 5 },
  videoGrid: { flexDirection: 'column', width: '100%', height: '80%', position: 'relative', borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  remoteVideo: { flex: 1, backgroundColor: '#000' },
  localVideo: { position: 'absolute', bottom: 20, right: 20, width: 120, height: 180, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  retryContainer: { alignItems: 'center', padding: 40 },
  retryText: { color: '#a1a1aa', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#10b981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Permission UI
  permissionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 360,
    width: '100%'
  },
  permissionIconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center'
  },
  permissionText: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  permissionSteps: {
    alignSelf: 'stretch',
    marginBottom: 24,
    paddingHorizontal: 8
  },
  permissionStep: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
    lineHeight: 20
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  permissionCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  permissionCancelText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '500'
  }
});
