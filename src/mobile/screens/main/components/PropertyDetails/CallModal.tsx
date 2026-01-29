import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';

type Props = {
    visible: boolean;
    requestId: string;
    pc: any; // RTCPeerConnection
    remoteStream: any; // MediaStream
    localStream: any; // MediaStream
    connectionState?: string;
    onClose: () => void;
};

const getConnectionStatusText = (state?: string) => {
    switch (state) {
        case 'connected':
            return 'Connected';
        case 'connecting':
            return 'Connecting...';
        case 'disconnected':
            return 'Disconnected';
        case 'failed':
            return 'Connection Failed';
        case 'closed':
            return 'Call Ended';
        default:
            return 'Connecting...';
    }
};

const getConnectionStatusColor = (state?: string) => {
    switch (state) {
        case 'connected':
            return '#4ade80'; // green
        case 'connecting':
        case 'new':
            return '#fbbf24'; // yellow
        case 'disconnected':
        case 'failed':
            return '#ef4444'; // red
        default:
            return '#fbbf24';
    }
};

export const CallModal = ({ visible, requestId: _requestId, pc: _pc, remoteStream, localStream, connectionState, onClose }: Props) => {
    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    {/* Connection state indicator */}
                    <View style={styles.statusBar}>
                        <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor(connectionState) }]} />
                        <Text style={styles.statusText}>{getConnectionStatusText(connectionState)}</Text>
                    </View>

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
    statusBar: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
