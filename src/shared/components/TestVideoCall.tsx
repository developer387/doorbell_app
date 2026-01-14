import React, { useEffect } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoView } from './VideoView';

interface TestVideoCallProps {
    propertyId: string;
    requestId: string;
    mode: 'owner' | 'guest'; // Owner joins, Guest starts
}

export const TestVideoCall = ({ propertyId, requestId, mode }: TestVideoCallProps) => {
    const {
        localStream,
        remoteStream,
        isCallActive,
        connectionStatus,
        startCall,
        joinCall,
        endCall,
        toggleMute,
        isMuted,
        switchCamera
    } = useWebRTC(propertyId, requestId);

    useEffect(() => {
        // Cleanup on unmount
        return () => endCall();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.statusPanel}>
                <Text style={styles.statusText}>Status: {connectionStatus}</Text>
                <Text style={styles.statusText}>Active: {isCallActive ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.videoContainer}>
                {/* Remote Stream (Large) */}
                <View style={styles.remoteVideo}>
                    {remoteStream ? (
                        <VideoView
                            streamURL={remoteStream}
                            style={styles.fullSize}
                            objectFit="cover"
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderText}>Waiting for remote video...</Text>
                        </View>
                    )}
                </View>

                {/* Local Stream (Small Overlay) */}
                <View style={styles.localVideo}>
                    {localStream ? (
                        <VideoView
                            streamURL={localStream}
                            style={styles.fullSize}
                            objectFit="cover"
                            mirror={true}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderText}>No Local</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.controls}>
                {!isCallActive ? (
                    <Button
                        title={mode === 'guest' ? "Start Call" : "Join Call"}
                        onPress={mode === 'guest' ? startCall : joinCall}
                    />
                ) : (
                    <Button title="End Call" onPress={endCall} color="red" />
                )}

                {isCallActive && (
                    <>
                        <Button title={isMuted ? "Unmute" : "Mute"} onPress={toggleMute} />
                        <Button title="Flip Camera" onPress={switchCamera} />
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    statusPanel: {
        padding: 10,
        backgroundColor: '#222',
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    statusText: {
        color: 'white',
    },
    videoContainer: {
        flex: 1,
        position: 'relative',
    },
    remoteVideo: {
        flex: 1,
        backgroundColor: '#111',
    },
    localVideo: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 100,
        height: 150,
        backgroundColor: '#333',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'white',
        zIndex: 5,
    },
    fullSize: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#666',
    },
    controls: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#222',
    },
});
