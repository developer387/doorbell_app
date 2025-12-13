import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PropertyService } from '@/services/property.service';

export default function WebScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [facing] = useState<CameraType>('back');
    const [torch, setTorch] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation<any>();

    if (!permission) {
        // Permission hook is still loading
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <Text style={styles.message}>We need camera access to scan QR codes</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.button}>
                        <Text style={styles.buttonText}>Grant Camera Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        setIsLoading(true);

        try {
            // Extract UUID from scanned QR code or URL
            let uuid = data.trim();
            console.log("Scanned Data:", uuid);

            // If it's a URL, try to extract specific params or ID
            if (uuid.startsWith('http') || uuid.includes('://')) {
                try {
                    // split query params
                    const queryString = uuid.split('?')[1];
                    if (queryString) {
                        const params = new URLSearchParams(queryString);
                        uuid = params.get('qrCodeUUID') || params.get('propertyId') || params.get('id') || uuid;
                    } else {
                        // No query params, maybe last path segment?
                        const parts = uuid.split('/').filter(p => p && p.length > 0);
                        if (parts.length > 0) {
                            uuid = parts[parts.length - 1];
                        }
                    }
                } catch (e) {
                    console.log('Error parsing URL, using full data:', e);
                }
            }

            console.log("Resolved UUID for lookup:", uuid);

            // Look up property by UUID
            const property = await PropertyService.findByQRCodeUUID(uuid);

            if (property) {
                // Check if guest access is allowed
                if (property.allowGuest === false) { // Explicit check for false, assuming true/undefined means allowed or handling default elsewhere if needed, but safer to check strictly if field exists
                    console.log("Property found but guest access is disabled:", property);
                    navigation.navigate('Unavailable');
                } else {
                    // Property found and allowed - navigate to Guest screen
                    console.log("Property found:", property);
                    navigation.navigate('Guest', { property });
                }
            } else {
                // Property not found - navigate to Error screen
                console.log("Property not found for UUID:", uuid);
                navigation.navigate('Error');
            }
        } catch (error) {
            console.error("Error looking up property:", error);
            // Navigate to error screen on exception
            navigation.navigate('Error');
        } finally {
            setIsLoading(false);
            // Reset scanner after a delay
            setTimeout(() => setScanned(false), 2000);
        }
    };

    const toggleTorch = () => {
        setTorch(!torch);
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => console.log("Back")} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <CameraView
                style={styles.camera}
                facing={facing}
                enableTorch={torch}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            >
                <View style={styles.overlay}>
                    <View style={styles.topOverlay}>
                        <View style={styles.textContainer}>
                            <Text style={styles.scanText}>Scan a DoorBell QR code</Text>
                        </View>
                    </View>

                    <View style={styles.middleOverlay}>
                        <View style={styles.leftOverlay} />
                        <View style={styles.cutoutContainer}>
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                        </View>
                        <View style={styles.rightOverlay} />
                    </View>

                    <View style={styles.bottomOverlay}>
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="white" />
                                <Text style={styles.loadingText}>Looking up property...</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.flashButton} onPress={toggleTorch}>
                                <View style={styles.flashIconContainer}>
                                    <Ionicons name={torch ? "flash" : "flash-off"} size={24} color="white" />
                                </View>
                                <Text style={styles.flashText}>Turn {torch ? "OFF" : "ON"} Flash</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const overlayColor = 'rgba(0,0,0,0.7)';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
    },
    camera: {
        flex: 1,
    },
    button: {
        backgroundColor: '#222',
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
    },
    header: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 10,
    },
    backButton: {
        padding: 10,
    },
    overlay: {
        flex: 1,
    },
    topOverlay: {
        flex: 1,
        backgroundColor: overlayColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    middleOverlay: {
        flexDirection: 'row',
    },
    leftOverlay: {
        flex: 1,
        backgroundColor: overlayColor,
    },
    rightOverlay: {
        flex: 1,
        backgroundColor: overlayColor,
    },
    bottomOverlay: {
        flex: 1,
        backgroundColor: overlayColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cutoutContainer: {
        height: 300,
        width: 300,
        // Transparent background
        position: 'relative',
    },
    cornerTL: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: 'white',
        borderTopLeftRadius: 10,
    },
    cornerTR: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: 'white',
        borderTopRightRadius: 10,
    },
    cornerBL: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: 'white',
        borderBottomLeftRadius: 10,
    },
    cornerBR: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: 'white',
        borderBottomRightRadius: 10,
    },
    textContainer: {
        backgroundColor: '#333',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    scanText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    flashButton: {
        alignItems: 'center',
    },
    flashIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    flashText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
    },
});
