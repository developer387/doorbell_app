import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, Modal } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView,
    RenderModeType
} from 'react-native-agora';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { agoraConfig } from '@/config/agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface CallModalProps {
    visible: boolean;
    channelId: string;
    onClose: () => void;
}

export const CallModal = ({ visible, channelId, onClose }: CallModalProps) => {
    const insets = useSafeAreaInsets();
    const agoraEngine = useRef<IRtcEngine>(null); // Use ref for engine
    const [remoteUid, setRemoteUid] = useState<number>(0);
    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    useEffect(() => {
        if (visible && channelId) {
            setupVideoCall();
        } else {
            leaveCall();
        }

        return () => {
            // Clean up on unmount
            if (agoraEngine.current) {
                agoraEngine.current.release();
                agoraEngine.current = null;
            }
        };
    }, [visible, channelId]);

    const setupVideoCall = async () => {
        try {
            // Initialize Agora Engine
            agoraEngine.current = createAgoraRtcEngine();
            const engine = agoraEngine.current;

            engine.initialize({
                appId: agoraConfig.appId,
                channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
            });

            // Enable Video
            engine.enableVideo();
            engine.startPreview();

            // Set Role
            engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

            // Register Event Listeners
            engine.addListener('onUserJoined', (_connection, uid) => {
                console.log('UserJoined', uid);
                setRemoteUid(uid);
            });

            engine.addListener('onUserOffline', (_connection, uid) => {
                console.log('UserOffline', uid);
                setRemoteUid(0);
            });

            engine.addListener('onJoinChannelSuccess', (_connection, elapsed) => {
                console.log('JoinChannelSuccess', _connection.channelId, _connection.localUid, elapsed);
                setIsJoined(true);
            });

            engine.addListener('onError', (err, msg) => {
                console.error('Agora Error', err, msg);
            });


            // Join Channel
            // Token is null for testing (App ID only mode)
            engine.joinChannel('', channelId, 0, {});

        } catch (e) {
            console.error('Error starting call', e);
        }
    };

    const leaveCall = () => {
        if (agoraEngine.current) {
            agoraEngine.current.leaveChannel();
            agoraEngine.current.release();
            agoraEngine.current = null;
        }
        setIsJoined(false);
        setRemoteUid(0);
    };

    const handleEndCall = () => {
        leaveCall();
        onClose();
    };

    const toggleMute = () => {
        if (agoraEngine.current) {
            agoraEngine.current.muteLocalAudioStream(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (agoraEngine.current) {
            agoraEngine.current.muteLocalVideoStream(isVideoEnabled);
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={handleEndCall}
        >
            <View style={styles.container}>
                {/* Video Area */}
                {remoteUid !== 0 ? (
                    // Guest Joined (Active Call)
                    <>
                        {/* Remote Video (Full Screen) */}
                        <RtcSurfaceView
                            style={styles.remoteVideo}
                            canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
                        />
                        {/* Local Video (PIP) */}
                        <View style={[styles.localVideoContainer, { top: insets.top + 16 }]}>
                            <RtcSurfaceView
                                style={styles.localVideo}
                                canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }}
                                zOrderMediaOverlay={true}
                            />
                        </View>
                    </>
                ) : (
                    // Waiting for Guest (Local Video Full Screen)
                    <View style={styles.container}>
                        <RtcSurfaceView
                            style={styles.remoteVideo}
                            canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }}
                        />
                        <View style={styles.overlayContainer}>
                            <ActivityIndicator size="large" color="white" />
                            <Text style={styles.waitingText}>Waiting for guest...</Text>
                        </View>
                    </View>
                )}

                {/* Controls */}
                <View style={[styles.controls, { marginBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                        {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={handleEndCall}>
                        <PhoneOff color="white" size={32} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                        {isVideoEnabled ? <VideoIcon color="white" size={24} /> : <VideoOff color="white" size={24} />}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    remoteVideo: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    waitingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#222',
    },
    waitingText: {
        color: 'white',
        marginTop: 16,
        fontSize: 18,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    localVideoContainer: {
        position: 'absolute',
        right: 16,
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    localVideo: {
        width: '100%',
        height: '100%',
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCallButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.error,
    },
});
