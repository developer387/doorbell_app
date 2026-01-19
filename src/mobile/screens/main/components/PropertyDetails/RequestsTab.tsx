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
import { type GuestRequest, type Property } from '@/types';
import { DatabaseErrorHandler, ErrorLogger, RetryUtils, ValidationUtils } from '@/utils/errorHandling';

interface RequestsTabProps {
  property: Property | null;
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

export const RequestsTab = ({ property }: RequestsTabProps) => {
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isCallVisible, setIsCallVisible] = useState(false);

  useEffect(() => {
    if (!property?.id) {
      setLoading(false);
      return;
    }

    // Validate property document ID
    const validation = ValidationUtils.validatePropertyDocumentId(property.id);
    if (!validation.isValid) {
      ErrorLogger.logError(new Error(validation.error), {
        operation: 'RequestsTab_useEffect',
        propertyId: property.id,
        additionalData: { step: 'property_validation' }
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listen to guest requests subcollection using the correct Firestore document ID
    const q = query(
      collection(db, 'properties', property.id, 'guestRequests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q, 
      async (snapshot) => {
        try {
          const requests: GuestRequest[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Validate that the request has required fields
            if (data.guestId && data.timestamp && data.status) {
              requests.push({
                id: doc.id,
                ...data,
              } as GuestRequest);
            } else {
              console.warn('Invalid guest request data:', doc.id, data);
              ErrorLogger.logError(new Error('Invalid guest request data'), {
                operation: 'RequestsTab_snapshot',
                propertyId: property.id,
                additionalData: { requestId: doc.id, invalidData: data }
              });
            }
          });
          
          // Sort by timestamp to ensure proper ordering (backup to Firestore orderBy)
          requests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          setGuestRequests(requests);

          // Check if all requests are resolved (not pending)
          const hasPending = requests.some((r) => r.status === 'pending');

          if (!hasPending && property?.id) {
            await updatePropertyPendingStatus(property.id, false);
          }
          setLoading(false);
        } catch (error: any) {
          ErrorLogger.logError(error, {
            operation: 'RequestsTab_snapshot_processing',
            propertyId: property.id,
            additionalData: { snapshotSize: snapshot.size }
          });
          console.error('Error processing guest requests snapshot:', error);
          setLoading(false);
        }
      },
      (error) => {
        const handledError = DatabaseErrorHandler.handleError(error, 'listen_guest_requests');
        ErrorLogger.logError(handledError, {
          operation: 'RequestsTab_snapshot_error',
          propertyId: property.id
        });
        console.error('Error listening to guest requests:', handledError.userMessage);
        setLoading(false);
        
        // Show user-friendly error message for persistent connection issues
        if (error.code === 'permission-denied') {
          Alert.alert('Access Error', 'Unable to access guest requests. Please check your permissions.');
        } else if (error.code === 'unavailable') {
          Alert.alert('Connection Error', 'Service temporarily unavailable. Please try refreshing.');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [property?.id]);

  const updatePropertyPendingStatus = async (propId: string, hasPending: boolean) => {
    try {
      // Validate property document ID
      const validation = ValidationUtils.validatePropertyDocumentId(propId);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const updateData: any = {
        hasPendingRequest: hasPending,
      };
      
      // If no pending requests, also clear the last request timestamp
      if (!hasPending) {
        updateData.lastRequestTimestamp = null;
      }
      
      // Execute with retry logic for network resilience
      await RetryUtils.withRetry(
        () => updateDoc(doc(db, 'properties', propId), updateData),
        {
          maxAttempts: 2,
          baseDelay: 1000,
          retryCondition: (error) => {
            // Retry on network errors but not on permission/validation errors
            return error.code === 'unavailable' || 
                   error.code === 'deadline-exceeded' ||
                   error.message?.includes('network');
          }
        }
      );
      
      console.log(`Property ${propId} pending status updated to: ${hasPending}`);
    } catch (error: any) {
      const handledError = DatabaseErrorHandler.handleError(error, 'updatePropertyPendingStatus');
      ErrorLogger.logError(handledError, {
        operation: 'updatePropertyPendingStatus',
        propertyId: propId,
        additionalData: { hasPending }
      });
      
      // Don't show user alert for this background operation
      // The UI will still work correctly even if this fails
      console.warn('Failed to update property pending status:', handledError.userMessage);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!property?.id) {
      const error = new Error('Missing property document ID for decline action');
      ErrorLogger.logError(error, {
        operation: 'handleDecline',
        propertyId: property?.id,
        additionalData: { requestId }
      });
      Alert.alert('Configuration Error', 'Property configuration error. Please refresh and try again.');
      return;
    }

    // Validate request ID
    if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) {
      const error = new Error('Invalid request ID for decline action');
      ErrorLogger.logError(error, {
        operation: 'handleDecline',
        propertyId: property.id,
        additionalData: { requestId }
      });
      Alert.alert('Validation Error', 'Invalid request. Please refresh and try again.');
      return;
    }
    
    try {
      // Validate and sanitize status
      const statusValidation = ValidationUtils.validateRequestStatus('declined');
      if (!statusValidation.isValid) {
        throw new Error(statusValidation.error);
      }

      // Update request status with retry logic
      await RetryUtils.withRetry(
        () => updateDoc(doc(db, 'properties', property.id, 'guestRequests', requestId.trim()), {
          status: statusValidation.sanitizedStatus,
        }),
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
      
      // Check if this was the last pending request and update property state
      const remainingPendingRequests = guestRequests.filter(
        r => r.id !== requestId && r.status === 'pending'
      );
      
      if (remainingPendingRequests.length === 0) {
        await updatePropertyPendingStatus(property.id, false);
      }
      
      console.log(`Successfully declined request ${requestId}`);
    } catch (error: any) {
      const handledError = DatabaseErrorHandler.handleError(error, 'decline_request');
      ErrorLogger.logError(handledError, {
        operation: 'handleDecline',
        propertyId: property.id,
        additionalData: { requestId }
      });
      Alert.alert('Error', handledError.userMessage);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!property?.id) {
      const error = new Error('Missing property document ID for accept action');
      ErrorLogger.logError(error, {
        operation: 'handleAccept',
        propertyId: property?.id,
        additionalData: { requestId }
      });
      Alert.alert('Configuration Error', 'Property configuration error. Please refresh and try again.');
      return;
    }
    
    try {
      // Update request status with retry logic
      await RetryUtils.withRetry(
        () => updateDoc(doc(db, 'properties', property.id, 'guestRequests', requestId), {
          status: 'accepted',
          callStarted: true,
          channelId: requestId
        }),
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
      
      // Check if this was the last pending request and update property state
      const remainingPendingRequests = guestRequests.filter(
        r => r.id !== requestId && r.status === 'pending'
      );
      
      if (remainingPendingRequests.length === 0) {
        await updatePropertyPendingStatus(property.id, false);
      }
      
      console.log(`Successfully accepted request ${requestId}`);
    } catch (error: any) {
      const handledError = DatabaseErrorHandler.handleError(error, 'accept_request');
      ErrorLogger.logError(handledError, {
        operation: 'handleAccept',
        propertyId: property.id,
        additionalData: { requestId }
      });
      Alert.alert('Error', handledError.userMessage);
      
      // Reset call modal state on error
      setActiveCallId(null);
      setIsCallVisible(false);
    }
  };

  const toggleVideo = (requestId: string) => {
    setPlayingVideo(playingVideo === requestId ? null : requestId);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return (
      `${date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) 
      } ${ 
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`
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
        <Body variant="secondary">No guest requests yet</Body>
        <SmallText variant="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
          Guest requests will appear here when visitors scan your property's QR code and submit video messages
        </SmallText>
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
                {request.propertyName && (
                  <View style={styles.detailRow}>
                    <Body>Property:</Body>
                    <Body variant="secondary">{request.propertyName}</Body>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Body>Status:</Body>
                  <Body variant={request.status === 'pending' ? 'primary' : 'secondary'}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Body>
                </View>
              </View>

              {/* Video Player */}
              {playingVideo === request.id && (
                <View style={styles.videoContainer}>
                  {request.videoUrl ? (
                    Platform.OS === 'web' ? (
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
                    )
                  ) : (
                    <View style={styles.noVideoContainer}>
                      <Body variant="secondary">Video not available</Body>
                    </View>
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
                      handleAccept(request.id);
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
      {activeCallId && property?.id && (
        <CallModal
          visible={isCallVisible}
          channelId={activeCallId}
          propertyId={property.id}
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
  noVideoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.borderColor,
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
