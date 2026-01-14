import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoView } from './VideoView';
import { Mic, MicOff, SwitchCamera, PhoneOff } from 'lucide-react-native';

interface ActiveCallProps {
    propertyId: string;
    requestId: string;
    mode: 'guest' | 'owner';
    onCallEnd: () => void;
}

export const ActiveCall = ({ propertyId, requestId, mode, onCallEnd }: ActiveCallProps) => {
    const {
        localStream,
        remoteStream,
        connectionStatus,
        startCall,
        joinCall,
        endCall,
        toggleMute,
        isMuted,
        switchCamera
    } = useWebRTC(propertyId, requestId);

    useEffect(() => {
        if (mode === 'owner') {
            startCall();
        } else {
            joinCall();
        }

        return () => {
            endCall();
        };
    }, []);

    const handleHangup = () => {
        endCall();
        onCallEnd();
    };

    return (
        <View style={styles.container}>
            {/* Main Video View (Remote) */}
            <View style={styles.remoteContainer}>
                {remoteStream ? (
                    <VideoView
                        streamURL={remoteStream}
                        style={styles.video}
                        objectFit="cover"
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text style={styles.statusText}>
                            {connectionStatus === 'connected' ? 'Waiting for video...' : `${connectionStatus}...`}
                        </Text>
                    </View>
                )}
            </View>

            {/* Local Video View (PIP) */}
            {localStream && (
                <View style={styles.localContainer}>
                    <VideoView
                        streamURL={localStream}
                        style={styles.localVideo}
                        objectFit="cover"
                        mirror={true}
                    />
                </View>
            )}

            {/* Controls Overlay */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                    onPress={toggleMute}
                >
                    {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, styles.hangupButton]}
                    onPress={handleHangup}
                >
                    <PhoneOff color="white" size={32} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={switchCamera}
                >
                    <SwitchCamera color="white" size={24} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 16,
        overflow: 'hidden',
    },
    remoteContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#222',
    },
    statusText: {
        color: '#aaa',
        marginTop: 10,
        fontSize: 16,
    },
    localContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        backgroundColor: '#333',
    },
    localVideo: {
        width: '100%',
        height: '100%',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        // backdropFilter: 'blur(10px)', // Not supported in RN directly
    },
    controlButtonActive: {
        backgroundColor: 'white',
    },
    hangupButton: {
        backgroundColor: '#ef4444',
        width: 72,
        height: 72,
        borderRadius: 36,
    },
});
