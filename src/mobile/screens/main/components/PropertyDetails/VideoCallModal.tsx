/**
 * Production-Grade Video Call Modal for Owner
 * Bulletproof UI with state-driven logic and error boundaries
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { RtcLocalView, RtcRemoteView } from 'react-native-agora';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Body, MediumText } from '@/typography';
import { useCallManager } from '@/hooks/useCallManager';
import { CallState, CallError } from '@/domain/call/types';

interface VideoCallModalProps {
  visible: boolean;
  requestId: string;
  guestName?: string;
  onClose: () => void;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  visible,
  requestId,
  guestName = 'Guest',
  onClose,
  onCallStarted,
  onCallEnded,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [error, setError] = useState<CallError | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  const [callState, callActions] = useCallManager({
    autoInitialize: true,
    onCallStarted: (reqId) => {
      console.log('Call started:', reqId);
      setShowConfirmation(false);
      onCallStarted?.();
    },
    onCallEnded: (reqId, reason) => {
      console.log('Call ended:', reqId, reason);
      onCallEnded?.();
      handleClose();
    },
    onError: (err) => {
      console.error('Call error:', err);
      setError(err);
    },
  });

  // Track remote user
  useEffect(() => {
    if (callState.state.type === 'active') {
      const guestParticipant = callState.state.participants.find(p => p.role === 'guest');
      setRemoteUid(guestParticipant?.uid || null);
    } else {
      setRemoteUid(null);
    }
  }, [callState.state]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setShowConfirmation(true);
      setError(null);
      setRemoteUid(null);
      callActions.reset();
    }
  }, [visible, callActions]);

  const handleStartCall = useCallback(async () => {
    try {
      setError(null);
      await callActions.startCall(requestId);
    } catch (err) {
      console.error('Failed to start call:', err);
      setError({
        code: 'START_CALL_FAILED',
        message: 'Failed to start video call',
        recoverable: true,
        timestamp: Date.now(),
      });
    }
  }, [requestId, callActions]);

  const handleEndCall = useCallback(async () => {
    try {
      await callActions.endCall();
    } catch (err) {
      console.error('Failed to end call:', err);
      // Force close even if end call fails
      handleClose();
    }
  }, [callActions]);

  const handleClose = useCallback(() => {
    // Ensure call is ended before closing
    if (callState.state.type === 'active' || callState.state.type === 'token_received') {
      callActions.endCall();
    }
    onClose();
  }, [callState.state.type, callActions, onClose]);

  const handleRetry = useCallback(() => {
    setError(null);
    callActions.reset();
    setShowConfirmation(true);
  }, [callActions]);

  const renderConfirmationScreen = () => (
    <View style={styles.confirmationContainer}>
      <View style={styles.confirmationContent}>
        <Text style={styles.confirmationTitle}>Start Video Call?</Text>
        <Text style={styles.confirmationText}>
          You're about to start a live video call with {guestName}.
        </Text>
        <Text style={styles.confirmationSubtext}>
          The guest will be able to join once you start the call.
        </Text>
      </View>
      
      <View style={styles.confirmationActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartCall}
        >
          <Text style={styles.startButtonText}>Start Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>
        {callState.state.type === 'requesting_token' && 'Requesting secure token...'}
        {callState.state.type === 'token_received' && 'Joining call...'}
        {callState.state.type === 'joining' && 'Connecting...'}
      </Text>
    </View>
  );

  const renderErrorScreen = () => (
    <View style={styles.errorContainer}>
      <AlertCircle size={64} color={colors.error} />
      <Text style={styles.errorTitle}>Call Failed</Text>
      <Text style={styles.errorMessage}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleClose}
        >
          <Text style={styles.cancelButtonText}>Close</Text>
        </TouchableOpacity>
        
        {error?.recoverable && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderActiveCall = () => (
    <View style={styles.callContainer}>
      {/* Remote Video */}
      <View style={styles.remoteVideoContainer}>
        {remoteUid ? (
          <RtcRemoteView.SurfaceView
            style={styles.remoteVideo}
            uid={remoteUid}
            channelId={callState.connectionInfo.channel || ''}
            renderMode={1} // Fit
          />
        ) : (
          <View style={styles.waitingForGuest}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.waitingText}>Waiting for {guestName} to join...</Text>
          </View>
        )}
      </View>

      {/* Local Video */}
      <View style={styles.localVideoContainer}>
        <RtcLocalView.SurfaceView
          style={styles.localVideo}
          channelId={callState.connectionInfo.channel || ''}
          renderMode={1} // Fit
        />
      </View>

      {/* Call Controls */}
      <View style={styles.callControls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            !callState.mediaState.localVideoEnabled && styles.controlButtonDisabled,
          ]}
          onPress={callActions.toggleLocalVideo}
        >
          {callState.mediaState.localVideoEnabled ? (
            <Video size={24} color="white" />
          ) : (
            <VideoOff size={24} color="white" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !callState.mediaState.localAudioEnabled && styles.controlButtonDisabled,
          ]}
          onPress={callActions.toggleLocalAudio}
        >
          {callState.mediaState.localAudioEnabled ? (
            <Mic size={24} color="white" />
          ) : (
            <MicOff size={24} color="white" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <PhoneOff size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.callInfoText}>
          {remoteUid ? `Connected with ${guestName}` : `Waiting for ${guestName}`}
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (error) {
      return renderErrorScreen();
    }

    switch (callState.state.type) {
      case 'idle':
        return showConfirmation ? renderConfirmationScreen() : renderLoadingScreen();
      
      case 'requesting_token':
      case 'token_received':
      case 'joining':
        return renderLoadingScreen();
      
      case 'active':
        return renderActiveCall();
      
      case 'ending':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Ending call...</Text>
          </View>
        );
      
      case 'ended':
        return (
          <View style={styles.endedContainer}>
            <Text style={styles.endedText}>Call ended</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'error':
        return renderErrorScreen();
      
      default:
        return renderLoadingScreen();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCloseButton}
            onPress={handleClose}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerCloseButton: {
    padding: 8,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  confirmationContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  callContainer: {
    flex: 1,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#222',
  },
  remoteVideo: {
    flex: 1,
  },
  waitingForGuest: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  localVideo: {
    flex: 1,
  },
  callControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  callInfoText: {
    color: 'white',
    fontSize: 14,
  },
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endedText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});