import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { db } from '@/config/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { X, Check } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Video, ResizeMode } from 'expo-av';
import { type Property } from '@/types/Property';

interface CallModalProps {
    visible: boolean;
    channelId: string; // This is the requestId
    propertyId: string;
    onClose: () => void;
}

export const CallModal = ({ visible, channelId, propertyId, onClose }: CallModalProps) => {
    const [requestData, setRequestData] = useState<any>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [selectedLocks, setSelectedLocks] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!visible || !channelId || !propertyId) return;
        setIsLoading(true);

        const fetchProperty = async () => {
            try {
                const docRef = doc(db, 'properties', propertyId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setProperty(snap.data() as Property);
                }
            } catch (e) {
                console.error("Error fetching property", e);
            }
        };

        fetchProperty();

        const unsub = onSnapshot(doc(db, 'properties', propertyId, 'guestRequests', channelId), (snap) => {
            if (snap.exists()) {
                setRequestData(snap.data());
            }
            setIsLoading(false);
        });

        return () => unsub();
    }, [visible, channelId, propertyId]);

    const handleGrantAccess = async () => {
        if (selectedLocks.length === 0) {
            Alert.alert("No Locks Selected", "Please select at least one lock to open for the guest, or decline the request.");
            return;
        }

        try {
            await updateDoc(doc(db, 'properties', propertyId, 'guestRequests', channelId), {
                status: 'accepted',
                allowedLocks: selectedLocks,
                respondedAt: new Date().toISOString()
            });
            onClose();
        } catch (error) {
            Alert.alert("Error", "Failed to grant access");
        }
    };

    const handleDecline = async () => {
        try {
            await updateDoc(doc(db, 'properties', propertyId, 'guestRequests', channelId), {
                status: 'declined',
                respondedAt: new Date().toISOString()
            });
            onClose();
        } catch (error) {
            Alert.alert("Error", "Failed to decline request");
        }
    };

    const toggleLockSelection = (deviceId: string) => {
        if (selectedLocks.includes(deviceId)) {
            setSelectedLocks(prev => prev.filter(id => id !== deviceId));
        } else {
            setSelectedLocks(prev => [...prev, deviceId]);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Guest Request 🔔</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#4ade80" />
                    </View>
                ) : (
                    <View style={styles.content}>
                        {/* Video Section */}
                        <View style={styles.videoContainer}>
                            {requestData?.videoUrl ? (
                                <Video
                                    style={styles.video}
                                    source={{ uri: requestData.videoUrl }}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    isLooping
                                    shouldPlay
                                />
                            ) : (
                                <View style={styles.placeholderVideo}>
                                    <Text style={styles.placeholderText}>Video loading or unavailable...</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.sectionTitle}>Select Access to Grant:</Text>

                        {/* Locks List */}
                        <ScrollView style={styles.locksList}>
                            {property?.smartLocks?.map((lock) => {
                                const isSelected = selectedLocks.includes(lock.device_id);
                                return (
                                    <TouchableOpacity
                                        key={lock.device_id}
                                        style={[styles.lockItem, isSelected && styles.lockItemSelected]}
                                        onPress={() => toggleLockSelection(lock.device_id)}
                                    >
                                        <View style={styles.lockInfo}>
                                            <Text style={styles.lockName}>{lock.display_name}</Text>
                                            <Text style={styles.lockType}>{lock.device_type}</Text>
                                        </View>
                                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                            {isSelected && <Check size={16} color="black" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={handleDecline}>
                                <Text style={styles.buttonText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleGrantAccess}>
                                <Text style={[styles.buttonText, { color: 'black' }]}>Grant Access</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a', // Dark theme matches guest app
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    closeButton: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    videoContainer: {
        width: '100%',
        height: 300,
        backgroundColor: 'black',
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    placeholderVideo: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#666',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
        marginBottom: 16,
    },
    locksList: {
        flex: 1,
        marginBottom: 20,
    },
    lockItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#333',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    lockItemSelected: {
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
    },
    lockInfo: {
        flex: 1,
    },
    lockName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    lockType: {
        fontSize: 12,
        color: '#999',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#4ade80',
        borderColor: '#4ade80',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 30,
        height: 56,
    },
    button: {
        flex: 1,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    declineButton: {
        backgroundColor: '#ef4444',
    },
    acceptButton: {
        backgroundColor: '#4ade80',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
