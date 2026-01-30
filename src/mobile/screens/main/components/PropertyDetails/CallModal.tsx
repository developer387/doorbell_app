import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { X, Lock, Check, Send, Mic, MicOff, SwitchCamera } from 'lucide-react-native';
import { SharedLock } from '@/types/GuestRequest';

type SmartLock = {
    device_id: string;
    display_name: string;
    manufacturer: string;
};

type Props = {
    visible: boolean;
    requestId: string;
    pc: any;
    remoteStream: any;
    localStream: any;
    connectionState?: string;
    smartLocks?: SmartLock[];
    isMuted?: boolean;
    isFrontCamera?: boolean;
    onClose: () => void;
    onShareLocks?: (locks: SharedLock[]) => void;
    onToggleMute?: () => void;
    onFlipCamera?: () => void;
};

const getConnectionStatusText = (state?: string) => {
    switch (state) {
        case 'connected': return 'Connected';
        case 'connecting': return 'Connecting...';
        case 'disconnected': return 'Disconnected';
        case 'failed': return 'Connection Failed';
        case 'closed': return 'Call Ended';
        default: return 'Connecting...';
    }
};

const getConnectionStatusColor = (state?: string) => {
    switch (state) {
        case 'connected': return '#4ade80';
        case 'connecting':
        case 'new': return '#fbbf24';
        case 'disconnected':
        case 'failed': return '#ef4444';
        default: return '#fbbf24';
    }
};

export const CallModal = ({
    visible,
    requestId: _requestId,
    pc: _pc,
    remoteStream,
    localStream,
    connectionState,
    smartLocks = [],
    isMuted = false,
    isFrontCamera = true,
    onClose,
    onShareLocks,
    onToggleMute,
    onFlipCamera,
}: Props) => {
    const [showLockSelector, setShowLockSelector] = useState(false);
    const [selectedLocks, setSelectedLocks] = useState<Set<string>>(new Set());
    const [locksShared, setLocksShared] = useState(false);

    const toggleLockSelection = (deviceId: string) => {
        const newSelected = new Set(selectedLocks);
        if (newSelected.has(deviceId)) {
            newSelected.delete(deviceId);
        } else {
            newSelected.add(deviceId);
        }
        setSelectedLocks(newSelected);
    };

    const handleShareLocks = () => {
        if (selectedLocks.size === 0) return;

        const locksToShare: SharedLock[] = smartLocks
            .filter((lock) => selectedLocks.has(lock.device_id))
            .map((lock) => ({
                device_id: lock.device_id,
                display_name: lock.display_name,
                manufacturer: lock.manufacturer,
            }));

        onShareLocks?.(locksToShare);
        setLocksShared(true);
        setShowLockSelector(false);
    };

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    {/* Connection state indicator */}
                    <View style={styles.statusBar}>
                        <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor(connectionState) }]} />
                        <Text style={styles.statusText}>{getConnectionStatusText(connectionState)}</Text>
                    </View>

                    {/* Remote video */}
                    {remoteStream ? (
                        <RTCView
                            streamURL={remoteStream.toURL()}
                            style={styles.remote}
                            objectFit="cover"
                        />
                    ) : (
                        <View style={[styles.remote, styles.waitingView]}>
                            <Text style={styles.waitingText}>Waiting for guest...</Text>
                        </View>
                    )}

                    {/* Local preview */}
                    {localStream && (
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.local}
                            objectFit="cover"
                            zOrder={1}
                            mirror={isFrontCamera}
                        />
                    )}

                    {/* Top Controls - Camera Flip */}
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.controlButton} onPress={onFlipCamera}>
                            <SwitchCamera size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.controlsContainer}>
                        {/* Mute Button */}
                        <TouchableOpacity
                            style={[styles.controlButtonLarge, isMuted && styles.controlButtonMuted]}
                            onPress={onToggleMute}
                        >
                            {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
                        </TouchableOpacity>

                        {/* Share Locks Button */}
                        {smartLocks.length > 0 && !locksShared && (
                            <TouchableOpacity
                                style={styles.shareLockButton}
                                onPress={() => setShowLockSelector(true)}
                            >
                                <Lock size={18} color="#fff" />
                                <Text style={styles.shareLockText}>Share Locks</Text>
                            </TouchableOpacity>
                        )}

                        {/* Locks Shared Indicator */}
                        {locksShared && (
                            <View style={styles.locksSharedBadge}>
                                <Check size={16} color="#10b981" />
                                <Text style={styles.locksSharedText}>
                                    {selectedLocks.size} shared
                                </Text>
                            </View>
                        )}

                        {/* Hang-up button */}
                        <TouchableOpacity style={styles.hangup} onPress={onClose}>
                            <Text style={styles.hangupText}>End</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Lock Selector Modal */}
                    {showLockSelector && (
                        <View style={styles.lockSelectorOverlay}>
                            <View style={styles.lockSelectorSheet}>
                                <View style={styles.lockSelectorHeader}>
                                    <Text style={styles.lockSelectorTitle}>Select locks to share</Text>
                                    <TouchableOpacity onPress={() => setShowLockSelector(false)}>
                                        <X size={24} color="#1a1a1a" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.lockSelectorSubtitle}>
                                    The guest will be able to unlock these doors during the call
                                </Text>

                                <ScrollView style={styles.lockList}>
                                    {smartLocks.map((lock) => (
                                        <TouchableOpacity
                                            key={lock.device_id}
                                            style={[
                                                styles.lockOption,
                                                selectedLocks.has(lock.device_id) && styles.lockOptionSelected,
                                            ]}
                                            onPress={() => toggleLockSelection(lock.device_id)}
                                        >
                                            <View style={styles.lockOptionIcon}>
                                                <Lock size={20} color="#fff" />
                                            </View>
                                            <View style={styles.lockOptionInfo}>
                                                <Text style={styles.lockOptionName}>{lock.display_name}</Text>
                                                <Text style={styles.lockOptionManufacturer}>{lock.manufacturer}</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    selectedLocks.has(lock.device_id) && styles.checkboxSelected,
                                                ]}
                                            >
                                                {selectedLocks.has(lock.device_id) && (
                                                    <Check size={14} color="#fff" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    style={[
                                        styles.shareButton,
                                        selectedLocks.size === 0 && styles.shareButtonDisabled,
                                    ]}
                                    onPress={handleShareLocks}
                                    disabled={selectedLocks.size === 0}
                                >
                                    <Send size={18} color="#fff" />
                                    <Text style={styles.shareButtonText}>
                                        Share {selectedLocks.size > 0 ? `(${selectedLocks.size})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
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
        height: '100%',
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
    remote: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    waitingView: {
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingText: {
        color: '#fff',
        fontSize: 16,
    },
    local: {
        position: 'absolute',
        width: 120,
        height: 160,
        top: 100,
        right: 20,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 12,
    },
    topControls: {
        position: 'absolute',
        top: 100,
        left: 20,
        flexDirection: 'row',
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    controlButtonLarge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlButtonMuted: {
        backgroundColor: '#ef4444',
    },
    shareLockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 28,
        gap: 8,
    },
    shareLockText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    locksSharedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 28,
        gap: 8,
    },
    locksSharedText: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: '500',
    },
    hangup: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#ff4d4d',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hangupText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    lockSelectorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    lockSelectorSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '70%',
    },
    lockSelectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    lockSelectorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    lockSelectorSubtitle: {
        fontSize: 14,
        color: '#71717a',
        marginBottom: 20,
    },
    lockList: {
        marginBottom: 20,
    },
    lockOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        marginBottom: 12,
    },
    lockOptionSelected: {
        backgroundColor: '#d1fae5',
        borderWidth: 2,
        borderColor: '#10b981',
    },
    lockOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    lockOptionInfo: {
        flex: 1,
    },
    lockOptionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    lockOptionManufacturer: {
        fontSize: 14,
        color: '#71717a',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d4d4d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
    },
    shareButtonDisabled: {
        backgroundColor: '#a3a3a3',
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
