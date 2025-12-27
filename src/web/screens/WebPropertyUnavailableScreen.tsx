import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ban } from 'lucide-react-native';

export default function WebPropertyUnavailableScreen() {
    const navigation = useNavigation<any>();

    const handleGoBack = () => {
        navigation.navigate('Welcome');
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ban size={80} color="#e67e22" strokeWidth={1.5} />
                </View>

                <Text style={styles.title}>Property Unavailable</Text>
                <Text style={styles.message}>
                    This property is currently not accepting guests or is temporarily unavailable.
                </Text>

                <TouchableOpacity style={styles.button} onPress={handleGoBack}>
                    <Text style={styles.buttonText}>Go to Home</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    iconContainer: {
        marginBottom: 32,
        padding: 24,
        borderRadius: 24,
        backgroundColor: 'rgba(230, 126, 34, 0.1)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    button: {
        backgroundColor: '#4ade80',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: '600',
    },
});
