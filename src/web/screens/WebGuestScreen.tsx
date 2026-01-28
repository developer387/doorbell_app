import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Image, Animated } from 'react-native';
import { useGuestRequest } from '../../shared/hooks/useGuestRequest';
import { useWebRTC } from '../../shared/hooks/useWebRTC';
import { db } from '../../shared/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';
import { PinInput } from '../components/guest/PinInput';
import { Bell, House } from 'lucide-react-native';

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
  const { request, addIceCandidate } = useGuestRequest(requestId);
  // Only init WebRTC if on mobile/web appropriately
  const { pc, init, addLocalTracks, remoteStream, localStream, createIceCandidate } = useWebRTC(Platform.OS !== 'web');

  useEffect(() => {
    if (!propertyId) {
      console.warn("No property ID found in route params");
    }
  }, [propertyId]);

  // 1. Ring Doorbell -> Immediately Start Call Flow
  const ringDoorbell = async () => {
    if (!propertyId) {
      alert("Missing Property ID");
      return;
    }

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
    } catch (err) {
      console.error("Failed to ring doorbell", err);
      alert("Could not start video call. Please check permissions.");
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setIsVerifyingPin(true);
    setTimeout(() => {
      setIsVerifyingPin(false);
      alert(`PIN ${pin} entered. Verification logic pending.`);
      setShowPinInput(false);
    }, 1000);
  };

  // 2. Handle Answer from Owner
  useEffect(() => {
    if (request?.status === 'calling' && request.callAnswer && !pc.current?.remoteDescription) {
      handleCallAnswer(request.callAnswer);
    }
  }, [request]);

  const handleCallAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      await pc.current?.setRemoteDescription(answer);
    } catch (e) {
      console.error("Error setting remote description", e);
    }
  };

  // 3. Handle ICE Candidates
  useEffect(() => {
    if (!pc.current || !requestId) return;

    // Send local candidates to Firestore
    const onIce = (e: any) => {
      if (e.candidate) {
        addIceCandidate(e.candidate.toJSON(), 'guest');
      }
    };
    pc.current.onicecandidate = onIce;

    // Receive remote candidates from Firestore
    if (request?.iceCandidates) {
      request.iceCandidates.forEach((c) => {
        if (c.from === 'owner') {
          try {
            const candidate = createIceCandidate(c.candidate);
            pc.current?.addIceCandidate(candidate);
          } catch (e) { console.warn("Candidate error", e); }
        }
      });
    }
  }, [pc.current, request?.iceCandidates, requestId]);

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
      {/* State: Idle (Not Ringing) */}
      {!requestId && (
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

      {/* State: Calling / Connected */}
      {requestId && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {request?.status === 'calling' ? 'Calling Owner...' : 'Connected'}
          </Text>

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
  statusText: { color: '#4ade80', fontSize: 20, marginBottom: 20, fontWeight: 'bold' },
  videoGrid: { flexDirection: 'column', width: '100%', height: '80%', position: 'relative', borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  remoteVideo: { flex: 1, backgroundColor: '#000' },
  localVideo: { position: 'absolute', bottom: 20, right: 20, width: 120, height: 180, backgroundColor: '#333', borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' }
});
