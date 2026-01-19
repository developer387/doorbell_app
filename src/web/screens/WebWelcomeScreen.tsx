import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import { PropertyService } from '@/services/property.service';

// Define route params type
type WelcomeRouteProp = RouteProp<{ Welcome: { uuid?: string } }, 'Welcome'>;

export default function WebWelcomeScreen() {
    const route = useRoute<WelcomeRouteProp>();
    const navigation = useNavigation<any>();
    const [isProcessing, setIsProcessing] = useState(false);

    const slideAnim = useRef(new Animated.Value(-100)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Extract UUID from params
    const { uuid } = route.params || {};

    useEffect(() => {
        if (uuid) {
            // UUID present - process it
            handleUUID(uuid);
        } else {
            // No UUID - show welcome animation
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [uuid]);

    const handleUUID = async (id: string) => {
        setIsProcessing(true);
        try {
            // Find property by UUID
            const property = await PropertyService.findByQRCodeUUID(id);

            if (property && PropertyService.validatePropertyDocumentId(property)) {
                if (property.allowGuest === false) {
                    navigation.replace('Unavailable');
                } else {
                    navigation.replace('Guest', { property });
                }
            } else {
                console.error('Property not found or invalid document ID for UUID:', id);
                navigation.replace('Error');
            }
        } catch (error) {
            console.error("Error fetching property:", error);
            navigation.replace('Error');
        } finally {
            setIsProcessing(false);
        }
    };

    // If processing UUID, show minimal loading
    if (isProcessing || uuid) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ade80" />
            </View>
        );
    }

    // Otherwise show welcome screen with animation
    return (
        <View style={styles.container}>
            {/* Animated gradient background circles */}
            <View style={styles.gradientCircle1} />
            <View style={styles.gradientCircle2} />

            <Animated.View
                style={[
                    styles.content,
                    {
                        transform: [{ translateX: slideAnim }],
                        opacity: fadeAnim,
                    }
                ]}
            >
                {/* Icon with glassmorphic effect */}
                <View style={styles.iconContainer}>
                    <Bell size={72} color="#4ade80" strokeWidth={1.5} />
                </View>

                <Text style={styles.title}>Welcome to Doorbell</Text>
                <Text style={styles.subtitle}>by Guest Registration</Text>

                <View style={styles.infoContainer}>
                    <View style={styles.infoDot} />
                    <Text style={styles.infoText}>
                        Scan a QR code to access your property
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Slate 900
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientCircle1: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: '#4ade80',
        opacity: 0.05,
        top: -100,
        left: -100,
    },
    gradientCircle2: {
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: '#3b82f6',
        opacity: 0.03,
        bottom: -150,
        right: -150,
    },
    content: {
        alignItems: 'center',
        padding: 40,
        width: '100%',
        maxWidth: 600,
        zIndex: 1,
    },
    iconContainer: {
        marginBottom: 32,
        padding: 32,
        borderRadius: 100,
        backgroundColor: 'rgba(74, 222, 128, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(74, 222, 128, 0.2)',
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#94a3b8', // Slate 400
        textAlign: 'center',
        marginBottom: 60,
        letterSpacing: 0.5,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    infoDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ade80',
        marginRight: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#cbd5e1', // Slate 300
        letterSpacing: 0.3,
    },
});
