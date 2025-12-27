import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FileQuestion } from 'lucide-react-native';

export default function Web404Screen() {
    const navigation = useNavigation<any>();

    const handleGoHome = () => {
        navigation.navigate('Welcome');
    };

    return (
        <View style={styles.container}>
            <View style={styles.gradientCircle1} />
            <View style={styles.gradientCircle2} />

            <View style={styles.content}>
                {/* Icon with error styling */}
                <View style={styles.iconContainer}>
                    <FileQuestion size={80} color="#f97316" strokeWidth={1.5} />
                </View>

                <Text style={styles.errorCode}>404</Text>
                <Text style={styles.title}>Page Not Found</Text>
                <Text style={styles.message}>
                    The page you&#39;re looking for doesn&#39;t exist or has been moved.
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleGoHome}>
                    <Text style={styles.buttonText}>Go to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Slate 900
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        position: 'relative',
        overflow: 'hidden',
    },
    gradientCircle1: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: '#f97316',
        opacity: 0.05,
        top: -100,
        right: -100,
    },
    gradientCircle2: {
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: '#ef4444',
        opacity: 0.03,
        bottom: -150,
        left: -150,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 500,
        zIndex: 1,
    },
    iconContainer: {
        marginBottom: 24,
        padding: 28,
        borderRadius: 100,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.2)',
    },
    errorCode: {
        fontSize: 80,
        fontWeight: 'bold',
        color: '#f97316', // Orange 500
        marginBottom: 8,
        letterSpacing: 2,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#94a3b8', // Slate 400
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: '#4ade80',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 12,
        width: '100%',
        maxWidth: 300,
        alignItems: 'center',
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    buttonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
