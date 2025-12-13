import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, Video, Square, Play, RotateCcw } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Heading, Body, MediumText } from '@/typography';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface RouteParams {
  requestId: string;
  guestId: string;
  propertyName: string;
}

const VideoPreview = ({ videoUri }: { videoUri: string }) => {
  const player = useVideoPlayer(videoUri, player => {
    player.loop = false;
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

export const CameraRecordingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();

    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setIsProcessing(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 5,
      });

      if (video?.uri) {
        console.log('📹 Video Taken:', {
          uri: video.uri,
          duration: 5,
          timestamp: new Date().toISOString(),
          requestId: params.requestId,
          guestId: params.guestId,
          propertyName: params.propertyName,
        });
        setRecordedVideo(video.uri);
      }

      setIsRecording(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error recording video:', error);
      setIsRecording(false);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const handleSendVideo = async () => {
    if (!recordedVideo) return;

    try {
      setIsProcessing(true);
      // Here you would upload the video to your backend/Firebase
      console.log('Sending video:', recordedVideo);
      
      Alert.alert('Success', 'Video sent successfully');
      
      // Navigate back to notifications
      navigation.goBack();
    } catch (error) {
      console.error('Error sending video:', error);
      Alert.alert('Error', 'Failed to send video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setRecordedVideo(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Heading weight="bold" variant="black" align="center">
          No access to camera
        </Heading>
        <Body variant="secondary" align="center">
          Please enable camera permissions in your device settings
        </Body>
      </View>
    );
  }

  if (recordedVideo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <ArrowLeft size={24} color={colors.dark} />
          </TouchableOpacity>
          <Heading weight="bold" variant="black">
            Video Preview
          </Heading>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.previewContainer}>
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
              src={recordedVideo}
              onError={(e) => {
                console.error('Video playback error:', e);
              }}
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <VideoPreview videoUri={recordedVideo} />
          )}
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            disabled={isProcessing}
          >
            <RotateCcw size={20} color={colors.primary} />
            <Body variant="primary" weight="bold">
              Retake
            </Body>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, isProcessing && styles.buttonDisabled]}
            onPress={handleSendVideo}
            disabled={isProcessing}
          >
            <Video size={20} color={colors.white} />
            <Body variant="white" weight="bold">
              {isProcessing ? 'Sending...' : 'Send Video'}
            </Body>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <Heading weight="bold" variant="black">
          Record Video
        </Heading>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />
      </View>

      <View style={styles.instructionContainer}>
        <MediumText variant="black" weight="bold" align="center">
          Ready to record
        </MediumText>
        <Body variant="secondary" align="center">
          Tap the button below to start recording. Recording will stop automatically after 5 seconds.
        </Body>
      </View>

      <View style={styles.recordingControlsContainer}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isRecording ? (
            <>
              <Square size={24} color={colors.white} fill={colors.white} />
              <Body variant="white" weight="bold">
                Stop Recording
              </Body>
            </>
          ) : (
            <>
              <Video size={24} color={colors.white} />
              <Body variant="white" weight="bold">
                Start Recording
              </Body>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  closeButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  instructionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
  recordingControlsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: colors.white,
  },
  recordButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recordButtonActive: {
    backgroundColor: '#dc2626',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginTop: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: colors.white,
  },
  retakeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
