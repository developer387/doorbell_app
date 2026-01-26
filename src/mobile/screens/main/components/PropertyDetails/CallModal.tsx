import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';

type Props = {
    visible: boolean;
    requestId: string;
    pc: any; // RTCPeerConnection
    remoteStream: any; // MediaStream 
    localStream: any; // MediaStream
    onClose: () => void;
};

export const CallModal = ({ visible, requestId, pc, remoteStream, localStream, onClose }: Props) => {
    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    {/* Remote video – fills most of the screen */}
                    {remoteStream ? (
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={styles.remote}
                            objectFit="cover"
                        />
                    ) : (
                        <View style={[styles.remote, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: '#fff' }}>Waiting for guest...</Text>
                        </View>
                    )}

                    {/* Local preview – picture‑in‑picture */}
                    {localStream && (
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.local}
                            objectFit="cover"
                            zOrder={1}
                        />
                    )}

                    {/* Hang‑up button */}
                    <TouchableOpacity style={styles.hangup} onPress={onClose}>
                        <Text style={styles.hangupText}>End Call</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        height: '100%', // Full screen for mobile mostly
        backgroundColor: '#000',
        overflow: 'hidden',
        position: 'relative',
    },
    remote: { flex: 1, width: '100%', height: '100%' },
    local: {
        position: 'absolute',
        width: 120,
        height: 160,
        top: 50,
        right: 20,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 8,
    },
    hangup: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: '#ff4d4d',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    hangupText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
