import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function WebScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [facing] = useState<CameraType>('back');
    const [torch, setTorch] = useState(false);
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

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        // Ideally, we validate the QR code format. For now, we simulate navigation to the Guest Screen.
        // Assuming the QR code contains a property ID or similar. 
        // For this demo, we'll just navigate to the 'Guest' screen.
        console.log("Scanned:", data);
        navigation.navigate('Guest', { data });

        // Reset scanner after a delay if needed, or rely on navigation
        setTimeout(() => setScanned(false), 2000);
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
                        <TouchableOpacity style={styles.flashButton} onPress={toggleTorch}>
                            <View style={styles.flashIconContainer}>
                                <Ionicons name={torch ? "flash" : "flash-off"} size={24} color="white" />
                            </View>
                            <Text style={styles.flashText}>Turn {torch ? "OFF" : "ON"} Flash</Text>
                        </TouchableOpacity>
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
    }
});
