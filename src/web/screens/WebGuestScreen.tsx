import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useGuestRequest } from '../../shared/hooks/useGuestRequest';
import { useWebRTC } from '../../shared/hooks/useWebRTC';
import { db } from '../../shared/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';
import { PinInput } from '../components/guest/PinInput';
import { Lock, Bell } from 'lucide-react-native';

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

  // Hooks for Signaling and WebRTC
  const { request, addIceCandidate } = useGuestRequest(requestId);
  // Only init WebRTC if on mobile/web appropriately, though logic inside hook handles platform
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
    // TODO: Implement actual PIN verification logic against Seam/Backend
    // For now, simulate delay
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
      {/* Property Info Header */}
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{propertyName}</Text>
        {propertyAddress ? <Text style={styles.propertyAddress}>{propertyAddress}</Text> : null}
      </View>

      {/* State: Idle (Not Ringing) */}
      {!requestId && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.btn} onPress={ringDoorbell}>
            <Bell size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.btnText}>Ring Doorbell</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setShowPinInput(true)}>
            <Lock size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.btnText}>I have an Access PIN</Text>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#111827', padding: 20, alignItems: 'center', justifyContent: 'center' }, // slate-900
  propertyInfo: { marginBottom: 40, alignItems: 'center' },
  propertyTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  propertyAddress: { fontSize: 16, color: '#9ca3af' }, // gray-400

  actionContainer: { width: '100%', maxWidth: 400, gap: 16 },

  btn: {
    backgroundColor: '#f59e0b', // amber-500
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  btnSecondary: {
    backgroundColor: '#374151', // gray-700
    shadowColor: '#000',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  statusContainer: { alignItems: 'center', width: '100%', flex: 1 },
  statusText: { color: '#4ade80', fontSize: 18, marginBottom: 20 },
  videoGrid: { flexDirection: 'column', width: '100%', height: 400, position: 'relative' },
  remoteVideo: { flex: 1, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden' },
  localVideo: { position: 'absolute', bottom: 10, right: 10, width: 100, height: 150, backgroundColor: '#333', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#fff' }
});
