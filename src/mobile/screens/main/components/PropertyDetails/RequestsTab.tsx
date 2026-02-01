import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, FlatList } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Circle } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Body, SmallText } from '@/typography';
import { useOwnerRequests } from '@/hooks/useOwnerRequests';
import { useWebRTC } from '@/hooks/useWebRTC';
import { CallModal } from './CallModal';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SharedLock } from '@/types/GuestRequest';

interface SmartLock {
  device_id: string;
  display_name: string;
  manufacturer: string;
}

interface RequestsTabProps {
  propertyId: string;
  smartLocks?: SmartLock[];
}

const RequestVideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={{ width: '100%', height: '100%' }}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

export const RequestsTab = ({ propertyId, smartLocks = [] }: RequestsTabProps) => {
  const { requests, setStatus, setCallAnswer, addIceCandidate, shareLocks, clearSharedLocks } = useOwnerRequests(propertyId);
  const { pc, init, addLocalTracks, remoteStream, localStream, close, createSessionDescription, addRemoteIceCandidate, connectionState, isMuted, toggleMute, isFrontCamera, flipCamera, setOnIceCandidate } = useWebRTC(true);

  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const processedCandidatesLocal = useRef<Set<string>>(new Set());

  // ANSWER CALL LOGIC
  const answerCall = async (req: any) => {
    try {
      console.log("Answering call:", req.id);

      // Set up ICE candidate handler BEFORE init() to capture all candidates
      // We have the request ID immediately, so we can send candidates directly
      setOnIceCandidate((candidate: RTCIceCandidateInit) => {
        console.log('[Owner] Sending ICE candidate to Firestore');
        addIceCandidate(req.id, candidate);
      });

      setActiveCallId(req.id);

      // 1. Init & Media
      await init();
      await addLocalTracks();

      if (!req.callOffer) {
        alert("Call invalid: no offer from guest.");
        return;
      }

      // 2. Set Remote Desc (Guest's Offer)
      const desc = createSessionDescription(req.callOffer);
      await pc.current?.setRemoteDescription(desc);

      // 3. Create Answer
      const answer = await pc.current?.createAnswer();
      await pc.current?.setLocalDescription(answer);

      // 4. Send Answer
      if (answer) {
        await setCallAnswer(req.id, answer);
      }
    } catch (e) {
      console.error("Failed to answer call", e);
      setActiveCallId(null);
      alert("Failed to connect call.");
    }
  };

  // SIGNALING & ICE Handling (For Active Call)
  useEffect(() => {
    if (!activeCallId) return;

    // Clear processed candidates for new call
    processedCandidatesLocal.current.clear();

    const unsub = onSnapshot(doc(db, 'guestRequests', activeCallId), async (snap) => {
      const data = snap.data();
      if (!data) return;

      // Listen for Remote ICE candidates (from Guest) with deduplication
      if (data.iceCandidates) {
        data.iceCandidates.forEach((c: any) => {
          if (c.from === 'guest') {
            const candidateId = JSON.stringify(c.candidate);
            if (!processedCandidatesLocal.current.has(candidateId)) {
              processedCandidatesLocal.current.add(candidateId);
              addRemoteIceCandidate(c.candidate);
            }
          }
        });
      }

      // Auto-close if status becomes 'ended' externally
      if (data.status === 'ended') {
        close();
        setActiveCallId(null);
      }
    });

    return () => unsub();
  }, [activeCallId, addRemoteIceCandidate, close]);

  // ICE candidate handler is now set up in answerCall() BEFORE init()
  // to ensure no candidates are lost during the race condition


  const toggleVideo = (requestId: string) => {
    setPlayingVideo(playingVideo === requestId ? null : requestId);
  };

  if (requests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Body variant="secondary">No requests yet</Body>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item: request }) => (
          <View style={[styles.requestCard, request.status === 'calling' && { borderColor: '#4ade80', borderWidth: 2 }]}>
            <View style={styles.requestHeader}>
              <View style={styles.guestInfo}>
                <View style={styles.avatarPlaceholder}><Circle size={24} color={colors.primary} /></View>
                <View>
                  <Body weight="bolder">Guest Message</Body>
                  <SmallText variant="secondary">{new Date(request.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}</SmallText>
                </View>
              </View>
              {request.videoUrl && (
                <TouchableOpacity onPress={() => toggleVideo(request.id)}>
                  <Text style={{ color: colors.primary }}>Watch Video</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Video Player */}
            {playingVideo === request.id && request.videoUrl && (
              <View style={styles.videoContainer}>
                <RequestVideoPlayer videoUrl={request.videoUrl} />
              </View>
            )}

            {/* Answer Button */}
            {request.status === 'calling' && (
              <TouchableOpacity style={[styles.recordButton, { backgroundColor: '#22c55e' }]} onPress={() => answerCall(request)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>📞 Answer Call</Text>
              </TouchableOpacity>
            )}

            {/* Missed Call */}
            {request.status === 'missed' && (
              <View style={styles.missedCallBadge}>
                <Text style={styles.missedCallText}>📵 Missed Call</Text>
              </View>
            )}

            {/* Fallback for pending (old flow or failed calls) */}
            {request.status === 'pending' && (
              <Text style={{ color: '#888', fontStyle: 'italic' }}>Pending Request</Text>
            )}

            {/* Status indicator */}
            <Text style={{ marginTop: 5, color: '#888' }}>
              Status: {request.status === 'missed' ? 'Missed' : request.status}
            </Text>
          </View>
        )}
      />

      {activeCallId && (
        <CallModal
          visible={true}
          requestId={activeCallId}
          pc={pc.current}
          remoteStream={remoteStream}
          localStream={localStream}
          connectionState={connectionState}
          smartLocks={smartLocks}
          isMuted={isMuted}
          isFrontCamera={isFrontCamera}
          onToggleMute={toggleMute}
          onFlipCamera={flipCamera}
          onShareLocks={(locks: SharedLock[]) => {
            shareLocks(activeCallId, locks);
          }}
          onClose={() => {
            // Clear shared locks when call ends
            clearSharedLocks(activeCallId);
            close();
            setActiveCallId(null);
            setStatus(activeCallId, 'ended');
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  requestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  missedCallBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  missedCallText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  guestInfo: { flexDirection: 'row', gap: 10 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  videoContainer: { height: 200, backgroundColor: '#000', marginBottom: 10, borderRadius: 8 },
  recordButton: { backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center' }
});
