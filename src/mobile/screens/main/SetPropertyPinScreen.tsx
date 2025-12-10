import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '@navigation-types';
import { colors } from '@/styles/colors';
import { Heading, Body } from '@/typography';
import { ArrowLeft } from 'lucide-react-native';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteProps = RouteProp<MainStackParamList, 'SetPropertyPin'>;

export const SetPropertyPinScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProps>();
    const { propertyData } = route.params;

    const [pin, setPin] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handlePinChange = (text: string) => {
        if (/^\d*$/.test(text) && text.length <= 4) {
            setPin(text);
        }
    };

    const handleContinue = async () => {
        if (pin.length !== 4) return;

        try {
            setIsSaving(true);
            const finalData = {
                ...propertyData,
                pinCode: pin,
            };

            await addDoc(collection(db, 'properties'), finalData);

            setIsSaving(false);
            navigation.navigate('LinkSmartLock', { propertyId: propertyData.propertyId });
        } catch (error) {
            console.error('Error saving property:', error);
            Alert.alert('Error', 'Failed to save property. Please try again.');
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <ArrowLeft size={24} color={colors.dark} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Heading weight="bold" variant="black" style={styles.title}>Create Property PIN Code</Heading>
                <Body variant="secondary" style={styles.description}>
                    Set a property PIN code, this will be required for guest to have access to the property.
                </Body>

                <View style={styles.pinContainer}>
                    {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={[styles.pinBox, pin.length > i && styles.pinBoxFilled]}>
                            <Heading weight="bold" variant={pin.length > i ? "black" : "secondary"}>
                                {pin[i] || ''}
                            </Heading>
                        </View>
                    ))}
                </View>

                {/* Hidden overlay input to capture taps anywhere in the pin area */}
                <TextInput
                    style={styles.hiddenInput}
                    value={pin}
                    onChangeText={handlePinChange}
                    keyboardType="numeric"
                    maxLength={4}
                    autoFocus
                    caretHidden
                />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, (pin.length !== 4 || isSaving) && styles.submitButtonDisabled]}
                    onPress={handleContinue}
                    disabled={pin.length !== 4 || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Body variant="white" weight="bold">Continue</Body>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    title: {
        marginBottom: 8,
        fontSize: 24,
    },
    description: {
        marginBottom: 40,
        color: '#64748b',
        lineHeight: 22,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        // gap: 16, // Use justify content space-between with fixed width/padding if needed, or gap if reliable
    },
    pinBox: {
        width: '22%', // distribute 4 boxes
        height: 70,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    pinBoxFilled: {
        borderColor: colors.primary,
        backgroundColor: '#fff', // Or slight tint
        borderWidth: 1.5,
    },
    hiddenInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        zIndex: 10,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
    },
    submitButton: {
        backgroundColor: colors.primary, // Primary color (green)
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 1,
        backgroundColor: '#E2E8F0', // Light grey for disabled
    },
});
