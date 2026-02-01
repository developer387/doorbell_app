import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Animated } from 'react-native';
import { useGuestRequest } from '../../shared/hooks/useGuestRequest';
import { useWebRTC } from '../../shared/hooks/useWebRTC';
import { db } from '../../shared/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';
import { PinInput } from '../components/guest/PinInput';
import { GuestLockSheet } from '../components/guest/GuestLockSheet';
import { Bell, Phone, Eye, Camera, Mic, MicOff, SwitchCamera, MapPin } from 'lucide-react-native';

// Memoized video component to prevent re-renders when timer updates
function RemoteVideoComponent({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
const RemoteVideo = memo(RemoteVideoComponent);

// Memoized local video component
function LocalVideoComponent({ stream, isFrontCamera }: { stream: MediaStream | null; isFrontCamera: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: isFrontCamera ? 'scaleX(-1)' : 'none',
      }}
    />
  );
}
const LocalVideo = memo(LocalVideoComponent);

export default function WebGuestScreen() {
  const route = useRoute<any>();
  const initialProperty = route.params?.property;
  const propertyId = initialProperty?.id;
  const propertyName = initialProperty?.propertyName || 'Doorbell';
  const propertyAddress = initialProperty?.address || '';

  const [requestId, setRequestId] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended' | 'failed' | 'timeout'>('idle');
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'prompt' | 'granted' | 'denied'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);
  const [showLockSheet, setShowLockSheet] = useState(false);
  const [hasCompletedCall, setHasCompletedCall] = useState(false);

  // Refs
  const answerProcessed = useRef(false);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processedCandidatesLocal = useRef<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringingSoundRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);

  // Initialize ringing sound for web
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create audio element with a standard ringtone
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      ringingSoundRef.current = audio;

      return () => {
        if (ringingSoundRef.current) {
          ringingSoundRef.current.pause();
          ringingSoundRef.current = null;
        }
      };
    }
  }, []);

  // Play/stop ringing sound based on call status
  useEffect(() => {
    if (Platform.OS === 'web' && ringingSoundRef.current) {
      if (callStatus === 'calling') {
        ringingSoundRef.current.play().catch(() => {
          // Autoplay may be blocked, that's ok
        });
      } else {
        ringingSoundRef.current.pause();
        ringingSoundRef.current.currentTime = 0;
      }
    }
  }, [callStatus]);

  // Hooks
  const { request, addIceCandidate, setStatus } = useGuestRequest(requestId);
  const {
    pc, init, addLocalTracks, remoteStream, localStream, connectionState,
    addRemoteIceCandidate, close, isMuted, toggleMute, isFrontCamera, flipCamera,
    setOnIceCandidate
  } = useWebRTC(Platform.OS !== 'web');

  // Pulse animation for ring button
  useEffect(() => {
    if (hasCompletedCall) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [hasCompletedCall]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  // Format call duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Listen for call ending by owner
  useEffect(() => {
    if (request?.status === 'ended' && callStatus !== 'ended') {
      handleCallEnded();
    }
  }, [request?.status]);

  // Graceful cleanup on page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (requestId && callStatus !== 'ended') {
        setStatus('ended');
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [requestId, callStatus, setStatus]);

  const handleCallEnded = () => {
    console.log('[Guest] Call ended by owner');
    setCallStatus('ended');
    setHasCompletedCall(true);
    close();
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    // Stop ringing sound
    if (ringingSoundRef.current) {
      ringingSoundRef.current.pause();
      ringingSoundRef.current.currentTime = 0;
    }
  };

  const endCall = async () => {
    console.log('[Guest] Ending call');
    try {
      await setStatus('ended');
    } catch (e) {
      console.error('Error setting status:', e);
    }
    close();
    setCallStatus('ended');
    setHasCompletedCall(true);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    // Stop ringing sound
    if (ringingSoundRef.current) {
      ringingSoundRef.current.pause();
      ringingSoundRef.current.currentTime = 0;
    }
  };

  const ringDoorbell = async () => {
    if (!propertyId) {
      alert("Missing Property ID");
      return;
    }
    if (hasCompletedCall) {
      return; // Prevent re-ringing after call completed
    }
    setPermissionStatus('prompt');
  };

  const startCall = async () => {
    try {
      // Reset refs for new call
      requestIdRef.current = null;
      pendingIceCandidates.current = [];

      // Set up ICE candidate handler BEFORE init() to capture all candidates
      // This handler will buffer candidates until we have the requestId
      setOnIceCandidate((candidate: RTCIceCandidateInit) => {
        if (requestIdRef.current) {
          // We have the requestId, send candidate directly to Firestore
          addIceCandidate(candidate, 'guest');
        } else {
          // Buffer the candidate until we have the requestId
          console.log('[Guest] Buffering ICE candidate until requestId is available');
          pendingIceCandidates.current.push(candidate);
        }
      });

      setDebugMessage('Setting up video connection...');
      await init();

      setDebugMessage('Requesting camera & microphone...');
      await addLocalTracks();

      setDebugMessage('Creating call request...');
      const offer = await pc.current?.createOffer();
      if (!offer) throw new Error("Failed to create offer");
      await pc.current?.setLocalDescription(offer);

      setDebugMessage('Connecting to property owner...');
      const docRef = await addDoc(collection(db, 'guestRequests'), {
        propertyId,
        status: 'calling',
        callOffer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      // Store requestId in ref and state
      requestIdRef.current = docRef.id;
      setRequestId(docRef.id);

      // Flush any buffered ICE candidates now that we have the requestId
      if (pendingIceCandidates.current.length > 0) {
        console.log(`[Guest] Flushing ${pendingIceCandidates.current.length} buffered ICE candidates`);
        for (const candidate of pendingIceCandidates.current) {
          await addIceCandidate(candidate, 'guest');
        }
        pendingIceCandidates.current = [];
      }

      setDebugMessage('');
      setCallStatus('calling');
      setPermissionStatus('granted');
      answerProcessed.current = false;
      processedCandidatesLocal.current.clear();

      // 30 second timeout - if owner doesn't answer, it becomes a missed call
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          setCallStatus('timeout');
          setStatus('missed');
          setHasCompletedCall(true);
        }
      }, 30000);
    } catch (err: any) {
      console.error("[Guest] Failed to start call:", err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        return;
      }

      let errorMsg = 'Failed to start call. Please try again.';
      if (err.name === 'NotFoundError') errorMsg = 'No camera or microphone found.';
      else if (err.name === 'NotReadableError') errorMsg = 'Camera is in use by another app.';

      setDebugMessage(errorMsg);
      setCallStatus('failed');
      setPermissionStatus('unknown');
    }
  };

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    await startCall();
    setIsRequestingPermission(false);
  };

  // Handle answer from owner
  useEffect(() => {
    if (request?.status === 'calling' && request.callAnswer && !answerProcessed.current) {
      handleCallAnswer(request.callAnswer);
    }
  }, [request?.callAnswer]);

  const handleCallAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (answerProcessed.current) return;
    try {
      answerProcessed.current = true;
      await pc.current?.setRemoteDescription(answer);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (e) {
      console.error("Error setting remote description", e);
      answerProcessed.current = false;
    }
  };

  // Update call status based on connection state
  useEffect(() => {
    if (connectionState === 'connected') {
      setCallStatus('connected');
    } else if (connectionState === 'failed' || connectionState === 'disconnected') {
      if (callStatus === 'connected') {
        setCallStatus('ended');
        setHasCompletedCall(true);
      } else {
        setCallStatus('failed');
      }
    }
  }, [connectionState]);

  // ICE candidate handler is now set up in startCall() BEFORE init()
  // to ensure no candidates are lost during the race condition

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

  const handlePinSubmit = async (pin: string) => {
    setIsVerifyingPin(true);
    setTimeout(() => {
      setIsVerifyingPin(false);
      alert(`PIN ${pin} entered. Verification logic pending.`);
      setShowPinInput(false);
    }, 1000);
  };

  // Check if owner has shared locks
  const hasSharedLocks = request?.sharedLocks && request.sharedLocks.length > 0;

  // PIN Input Screen
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
    );
  }

  return (
    <View style={styles.container}>
      {/* Permission Prompt */}
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
            {debugMessage ? (
              <View style={styles.debugContainer}>
                {!debugMessage.includes('failed') && !debugMessage.includes('No ') && !debugMessage.includes('in use') ? (
                  <ActivityIndicator size="small" color="#10b981" style={{ marginRight: 8 }} />
                ) : null}
                <Text style={[styles.debugText, debugMessage.includes('failed') && { color: '#ef4444' }]}>
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
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setPermissionStatus('unknown'); setDebugMessage(''); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Permission Denied */}
      {permissionStatus === 'denied' && !requestId && (
        <View style={styles.contentWrapper}>
          <View style={styles.permissionCard}>
            <View style={[styles.permissionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Camera size={32} color="#ef4444" />
            </View>
            <Text style={styles.permissionTitle}>Permission Required</Text>
            <Text style={styles.permissionText}>
              Camera and microphone access was denied. Please enable permissions in your browser settings and refresh.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={() => window.location.reload()}>
              <Text style={styles.permissionButtonText}>Refresh Page</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPermissionStatus('unknown')}>
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Idle - Ring Doorbell Screen */}
      {!requestId && permissionStatus !== 'prompt' && permissionStatus !== 'denied' && !hasCompletedCall && (
        <View style={styles.contentWrapper}>
          {/* Property Info */}
          <View style={styles.propertyInfoContainer}>
            <Text style={styles.propertyName}>{propertyName}</Text>
            {propertyAddress ? (
              <View style={styles.addressRow}>
                <MapPin size={14} color="#71717a" />
                <Text style={styles.propertyAddress}>{propertyAddress}</Text>
              </View>
            ) : null}
          </View>

          {/* Ring Button Label */}
          <View style={styles.ringLabelContainer}>
            <Text style={styles.ringLabel}>Ring DoorBell</Text>
          </View>

          {/* Ring Button */}
          <View style={styles.ringButtonContainer}>
            <Animated.View style={[styles.pulseRing3, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View style={[styles.pulseRing2, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View style={[styles.pulseRing1, { transform: [{ scale: pulseAnim }] }]} />
            <TouchableOpacity style={styles.ringButton} onPress={ringDoorbell} activeOpacity={0.8}>
              <Bell size={48} color="#fff" fill="#fff" />
            </TouchableOpacity>
          </View>

          {/* Access PIN Link */}
          <TouchableOpacity onPress={() => setShowPinInput(true)} style={styles.pinLink}>
            <Text style={styles.pinLinkText}>I have an Access PIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Call Completed - Cannot Ring Again */}
      {hasCompletedCall && callStatus !== 'calling' && callStatus !== 'connected' && (
        <View style={styles.contentWrapper}>
          <View style={styles.endedCard}>
            <Text style={styles.endedTitle}>
              {callStatus === 'ended' && 'Call Ended'}
              {callStatus === 'timeout' && 'No Answer'}
              {callStatus === 'failed' && 'Connection Failed'}
            </Text>
            <Text style={styles.endedSubtitle}>
              {callStatus === 'ended' && 'Thank you for visiting.'}
              {callStatus === 'timeout' && 'The owner didn\'t answer.'}
              {callStatus === 'failed' && 'Please check your connection.'}
            </Text>
            <Text style={styles.endedNote}>
              Please contact the property owner directly{'\n'}if you need further assistance.
            </Text>
          </View>
        </View>
      )}

      {/* Video Call Screen */}
      {requestId && callStatus !== 'ended' && callStatus !== 'timeout' && callStatus !== 'failed' && (
        <View style={styles.videoContainer}>
          {/* Remote Video (Owner) - Full Screen */}
          <View style={styles.remoteVideoContainer}>
            {remoteStream ? (
              Platform.OS === 'web' ? (
                <RemoteVideo stream={remoteStream} />
              ) : <Text style={{ color: '#fff' }}>Video</Text>
            ) : (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.waitingText}>
                  {callStatus === 'calling' ? 'Calling owner...' : 'Connecting...'}
                </Text>
              </View>
            )}
          </View>

          {/* Timer Badge */}
          {callStatus === 'connected' && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatDuration(callDuration)}</Text>
            </View>
          )}

          {/* Local Video (Self) - Top Right */}
          {localStream && (
            <View style={styles.localVideoContainer}>
              {Platform.OS === 'web' ? (
                <LocalVideo stream={localStream} isFrontCamera={isFrontCamera} />
              ) : <Text style={{ color: '#fff' }}>Local</Text>}
            </View>
          )}

          {/* Top Controls - Camera Flip */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={flipCamera}>
              <SwitchCamera size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.callControls}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[styles.controlButtonLarge, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
            </TouchableOpacity>

            {hasSharedLocks ? (
              // View Access + End Call
              <>
                <TouchableOpacity style={styles.viewAccessButton} onPress={() => setShowLockSheet(true)}>
                  <Eye size={20} color="#1a1a1a" />
                  <Text style={styles.viewAccessText}>View access</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.endCallButtonSmall} onPress={endCall}>
                  <Phone size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
              </>
            ) : (
              // End Call button only
              <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
                <Text style={styles.hangupText}>End</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Lock Control Sheet */}
      {showLockSheet && request?.sharedLocks && (
        <GuestLockSheet
          visible={showLockSheet}
          locks={request.sharedLocks}
          onClose={() => setShowLockSheet(false)}
          onEndCall={endCall}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Property Info
  propertyInfoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  propertyName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyAddress: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },

  // Ring Button
  ringLabelContainer: {
    backgroundColor: '#27272a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
  },
  ringLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ringButtonContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pulseRing1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#10b981',
  },
  pulseRing2: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
  },
  pulseRing3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  ringButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinLink: {
    position: 'absolute',
    bottom: 60,
  },
  pinLinkText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Permission
  permissionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 360,
    width: '100%',
  },
  permissionIconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  // eslint-disable-next-line react-native/no-color-literals
  cancelButtonText: {
    color: '#71717a',
    fontSize: 14,
  },
  debugContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  debugText: {
    color: '#a1a1aa',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },

  // Video Call
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  timerBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  topControls: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 130,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callControls: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#ef4444',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewAccessButton: {
    flex: 1,
    maxWidth: 180,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  viewAccessText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '600',
  },
  endCallButtonSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ended State
  endedCard: {
    alignItems: 'center',
  },
  endedTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  endedSubtitle: {
    color: '#a1a1aa',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  endedNote: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
