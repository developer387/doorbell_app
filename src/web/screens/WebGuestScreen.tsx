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
  const [debugMessage, setDebugMessage] = useState<string>('');

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

  // 1. Ring Doorbell -> Show permission prompt first
  const ringDoorbell = async () => {
    if (!propertyId) {
      alert("Missing Property ID");
      return;
    }

    // Show permission prompt UI first to explain what we need
    setPermissionStatus('prompt');
  };

  // Actually start the video call (called after user clicks Allow Access)
  const startCall = async () => {
    try {
      setDebugMessage('Starting call...');

      // A. Init WebRTC
      setDebugMessage('Setting up video connection...');
      await init();

      // B. Get media and add tracks (this triggers browser permission prompt)
      setDebugMessage('Requesting camera & microphone...');
      await addLocalTracks();

      // C. Create Offer
      setDebugMessage('Creating call request...');
      const offer = await pc.current?.createOffer();
      if (!offer) throw new Error("Failed to create offer - peer connection not ready");
      await pc.current?.setLocalDescription(offer);

      // D. Update Database
      setDebugMessage('Connecting to property owner...');
      const docRef = await addDoc(collection(db, 'guestRequests'), {
        propertyId: propertyId,
        status: 'calling',
        callOffer: {
          type: offer.type,
          sdp: offer.sdp
        },
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      setDebugMessage('');
      setRequestId(docRef.id);
      setCallStatus('calling');
      setPermissionStatus('granted');
      answerProcessed.current = false;
      processedCandidatesLocal.current.clear();

      // Set up call timeout (60 seconds)
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          setCallStatus('timeout');
          setStatus('timeout');
        }
      }, 60000);
    } catch (err: any) {
      console.error("[Guest] Failed to start call:", err);
      setCallStatus('failed');

      // Provide specific error messages shown on screen
      let errorMsg = '';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        return; // Will show denied UI
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera or microphone found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is in use by another app. Please close other apps and try again.';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Camera does not support required settings.';
      } else if (err.message?.includes('Firestore') || err.code === 'permission-denied') {
        errorMsg = 'Cannot connect to server. Check your internet connection.';
      } else if (err.name === 'TypeError' && err.message?.includes('getUserMedia')) {
        errorMsg = 'Your browser does not support video calls. Please use Chrome or Safari.';
      } else {
        errorMsg = `Error: ${err.name || 'Unknown'} - ${err.message || 'Please try again'}`;
      }

      setDebugMessage(errorMsg);
      setPermissionStatus('unknown');
    }
  };

  // Handle permission request from prompt UI - just start the call directly
  // The browser will prompt for permissions when we call getUserMedia in addLocalTracks
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    await startCall();
    setIsRequestingPermission(false);
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

            {/* Status/Error Message */}
            {debugMessage ? (
              <View style={styles.debugMessageContainer}>
                {!debugMessage.startsWith('Error') && !debugMessage.includes('found') && !debugMessage.includes('use') && !debugMessage.includes('support') && !debugMessage.includes('connect') ? (
                  <ActivityIndicator size="small" color="#10b981" style={{ marginRight: 8 }} />
                ) : null}
                <Text style={[
                  styles.debugMessageText,
                  (debugMessage.startsWith('Error') || debugMessage.includes('found') || debugMessage.includes('use') || debugMessage.includes('support') || debugMessage.includes('connect'))
                    && { color: '#ef4444' }
                ]}>
                  {debugMessage}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.permissionButton, isRequestingPermission && { opacity: 0.7 }]}
              onPress={handleRequestPermission}
              disabled={isRequestingPermission}
            >
              <Text style={styles.permissionButtonText}>
                {isRequestingPermission ? 'Please wait...' : 'Allow Access & Call'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.permissionCancelButton}
              onPress={() => {
                setPermissionStatus('unknown');
                setDebugMessage('');
              }}
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
  },
  debugMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%'
  },
  debugMessageText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    flex: 1
  }
});
