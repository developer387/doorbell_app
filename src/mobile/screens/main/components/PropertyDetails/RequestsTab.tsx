import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, Circle } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Body, MediumText, SmallText } from '@/typography';
import { collection, query, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Loading } from '@/components';
import { CallModal } from './CallModal';

interface RequestsTabProps {
  propertyId: string;
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

export const RequestsTab = ({ propertyId }: RequestsTabProps) => {
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isCallVisible, setIsCallVisible] = useState(false);

  useEffect(() => {
    if (!propertyId) return;

    // Listen to guest requests subcollection
    const q = query(
      collection(db, 'properties', propertyId, 'guestRequests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests: GuestRequest[] = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data(),
        } as GuestRequest);
      });
      setGuestRequests(requests);

      // Check if all requests are resolved (not pending)
      const hasPending = requests.some((r) => r.status === 'pending');

      if (!hasPending) {
        await updatePropertyPendingStatus(propertyId, false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [propertyId]);

  const updatePropertyPendingStatus = async (propId: string, hasPending: boolean) => {
    try {
      await updateDoc(doc(db, 'properties', propId), {
        hasPendingRequest: hasPending,
      });
    } catch (e) {
      console.error('Failed to update property status', e);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'properties', propertyId, 'guestRequests', requestId), {
        status: 'declined',
      });
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  const toggleVideo = (requestId: string) => {
    setPlayingVideo(playingVideo === requestId ? null : requestId);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ' ' +
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const groupByMonth = (requests: GuestRequest[]) => {
    const groups: Record<string, GuestRequest[]> = {};
    requests.forEach((request) => {
      const date = new Date(request.timestamp);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(request);
    });
    return groups;
  };

  const requestsByMonth = groupByMonth(guestRequests);


  if (loading) {
    return (
      <View style={styles.content}>
        <Loading />
      </View>
    );
  }

  if (guestRequests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Body variant="secondary">No requests yet</Body>
      </View>
    );
  }

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {Object.keys(requestsByMonth).map((monthYear) => (
        <View key={monthYear}>
          <Body weight="bolder" style={styles.monthHeader}>
            {monthYear}
          </Body>
          {requestsByMonth[monthYear].map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.guestInfo}>
                  <View style={styles.avatarPlaceholder}>
                    <Circle size={24} color={colors.primary} />
                  </View>
                  <View>
                    <Body weight="bolder">Guest</Body>
                    <SmallText variant="secondary">ID: {request.guestId}</SmallText>
                  </View>
                </View>
                <TouchableOpacity onPress={() => toggleVideo(request.id)}>
                  <Body variant="primary" style={styles.watchVideoButton}>
                    Watch Video
                    <Play size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                  </Body>
                </TouchableOpacity>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <Body>Date & Time:</Body>
                  <Body variant="secondary">{formatDate(request.timestamp)}</Body>
                </View>
              </View>

              {/* Video Player */}
              {playingVideo === request.id && request.videoUrl && (
                <View style={styles.videoContainer}>
                  {Platform.OS === 'web' ? (
                    <video
                      controls
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#000',
                      }}
                      src={request.videoUrl}
                    />
                  ) : (
                    <RequestVideoPlayer videoUrl={request.videoUrl} />
                  )}
                </View>
              )}

              {request.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.recordButton}
                    onPress={() => {
                      setActiveCallId(request.id);
                      setIsCallVisible(true);
                      // Update status to accepted
                      updateDoc(doc(db, 'properties', propertyId, 'guestRequests', request.id), {
                        status: 'accepted',
                        callStarted: true,
                        channelId: request.id
                      });
                    }}
                  >
                    <MediumText variant="white" weight="bold">
                      Accept
                    </MediumText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDecline(request.id)}
                  >
                    <MediumText variant="white" weight="bold">
                      Decline
                    </MediumText>
                  </TouchableOpacity>
                </View>
              )}

              {request.status !== 'pending' && (
                <View style={styles.statusBadge}>
                  <SmallText variant="secondary">
                    {request.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                  </SmallText>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
      {activeCallId && (
        <CallModal
          visible={isCallVisible}
          channelId={activeCallId}
          onClose={() => {
            setIsCallVisible(false);
            setActiveCallId(null);
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    marginTop: 16,
  },
  monthHeader: {
    marginVertical: 12,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.activeTagBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  declineButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  recordButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
