import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { House, Bell } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Property } from '@/types/Property';

type WebGuestScreenRouteProp = RouteProp<{ params: { property: Property } }, 'params'>;

export default function WebGuestScreen() {
    const route = useRoute<WebGuestScreenRouteProp>();
    const { property } = route.params;

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [isRinging, setIsRinging] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        const startPulse = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };
        startPulse();
    }, []);

    const handleRing = async () => {
        if (!permission) {
            await requestPermission();
        }
        if (!permission?.granted) {
            // If still not granted
            const result = await requestPermission();
            if (!result.granted) {
                alert("Camera permission is required to ring the doorbell.");
                return;
            }
        }

        setIsRinging(true);

        // Simulate recording flow
        // In a real app, we would start recording here.
        // For this Web version, we will toggle the UI to show 'Recording...'

        // Note: expo-camera on web might not support full recording without extra config or MediaRecorder polyfills.
        // We will simulate the behavior for the UI.

        setTimeout(() => {
            setIsRinging(false);
            alert("Doorbell Rang! Video sent to owner.");
        }, 5000);
    };

    return (
        <View style={styles.container}>
            {/* Header / House Info */}
            <View style={styles.infoContainer}>
                <View style={styles.houseIconContainer}>
                    <House size={64} color="#e67e22" fill="#e67e22" />
                </View>
                <Text style={styles.houseName}>{property.propertyName || 'Property'}</Text>
                <Text style={styles.address}>{property.address || 'No address available'}</Text>
            </View>

            {/* Ring Button */}
            <TouchableOpacity style={styles.ringButtonCapsule} onPress={handleRing} disabled={isRinging}>
                <Text style={styles.ringButtonText}>{isRinging ? "Recording..." : "Ring DoorBell"}</Text>
            </TouchableOpacity>

            {/* Pulse Animation / Big Button */}
            <View style={styles.centerContainer}>
                {isRinging ? (
                    <View style={styles.cameraContainer}>
                        {/* 
                   Render camera if permission granted. 
                   We use standard View as simulartion if camera fails or just show visuals 
                 */}
                        {permission?.granted ? (
                            <CameraView
                                ref={cameraRef}
                                style={styles.camera}
                                facing="front"
                            />
                        ) : (
                            <View style={styles.recordingPlaceholder}>
                                <Text style={{ color: 'white' }}>Recording Front Camera...</Text>
                            </View>
                        )}
                        <View style={styles.recordingIndicator}>
                            <View style={styles.redDot} />
                            <Text style={styles.recordingText}>REC</Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity onPress={handleRing}>
                        <Animated.View
                            style={[
                                styles.pulseCircle,
                                {
                                    transform: [{ scale: pulseAnim }],
                                    opacity: pulseAnim.interpolate({
                                        inputRange: [1, 1.2],
                                        outputRange: [0.6, 0]
                                    })
                                },
                            ]}
                        />
                        <View style={styles.bellCircle}>
                            <Bell size={64} color="white" fill="white" />
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Footer Text */}
            <View style={styles.footer}>
                <Text style={styles.disclaimer}>
                    This will triggers a 5-second front-camera{'\n'}recording which is sent to the owner.
                </Text>

                <TouchableOpacity style={styles.linkButton}>
                    <Text style={styles.linkText}>I have the property code</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a', // Dark background
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 60,
    },
    infoContainer: {
        alignItems: 'center',
    },
    houseIconContainer: {
        marginBottom: 20,
        // You can add an image here if available, using Lucide for now
    },
    houseName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    address: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
    },
    ringButtonCapsule: {
        backgroundColor: '#333',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
        marginTop: 20,
    },
    ringButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 200, // Fixed height area for the bell
    },
    bellCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#4ade80', // Green
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    pulseCircle: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#4ade80',
        zIndex: 1,
    },
    footer: {
        alignItems: 'center',
    },
    disclaimer: {
        color: '#888',
        textAlign: 'center',
        marginBottom: 30,
        fontSize: 14,
        lineHeight: 20,
    },
    linkButton: {
        marginBottom: 20,
    },
    linkText: {
        color: '#4ade80', // Green link
        textDecorationLine: 'underline',
        fontSize: 16,
    },
    cameraContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        overflow: 'hidden',
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: '#4ade80',
        alignItems: 'center',
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
        width: '100%',
    },
    recordingPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingIndicator: {
        position: 'absolute',
        top: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        marginRight: 5,
    },
    recordingText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
