import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { ArrowLeft, MapPin, QrCode } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const AddPropertyScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Form state
  const [category, setCategory] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleStartScanning = () => {
    setCameraActive(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setQrData(data);
    setCameraActive(false);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!category || !propertyName || !address) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // TODO: Submit the form data along with QR code data
    Alert.alert('Success', `Property added!\nQR Data: ${qrData}`, [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noPermissionText}>No access to camera</Text>
        <Text style={styles.noPermissionSubtext}>
          Please enable camera permissions in your device settings
        </Text>
      </View>
    );
  }

  // Show camera scanner
  if (cameraActive && !showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCameraActive(false)} style={styles.closeButton}>
            <ArrowLeft size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>Position the QR code in the frame</Text>
          <Text style={styles.instructionText}>
            Align the QR code within the frame to scan automatically
          </Text>
        </View>

        {scanned && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => {
              setScanned(false);
              setQrData(null);
            }}
          >
            <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Show form after scanning
  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <ArrowLeft size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Property</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Enter your property details</Text>

          {/* Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Category"
                placeholderTextColor="#94a3b8"
                value={category}
                onChangeText={setCategory}
              />
            </View>
          </View>

          {/* Property Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Property name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Property name"
                placeholderTextColor="#94a3b8"
                value={propertyName}
                onChangeText={setPropertyName}
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Address"
                placeholderTextColor="#94a3b8"
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
            <TouchableOpacity style={styles.locationButton}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.locationButtonText}>Use Current Location</Text>
            </TouchableOpacity>
          </View>

          {/* QR Data Display */}
          {qrData && (
            <View style={styles.qrDataContainer}>
              <Text style={styles.qrDataLabel}>Scanned QR Code:</Text>
              <Text style={styles.qrDataText}>{qrData}</Text>
            </View>
          )}

          {/* Map Placeholder */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Map will be displayed here</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Proceed</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Initial screen with button to start scanning
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Property</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.startScanContainer}>
        <View style={styles.qrIconContainer}>
          <QrCode size={80} color={colors.primary} strokeWidth={1.5} />
        </View>

        <Text style={styles.startScanTitle}>Scan Property QR Code</Text>
        <Text style={styles.startScanText}>
          To add a new property, you need to scan the QR code provided with your doorbell device.
        </Text>

        <TouchableOpacity style={styles.startScanButton} onPress={handleStartScanning}>
          <QrCode size={20} color={colors.white} />
          <Text style={styles.startScanButtonText}>Start Scanning</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  startScanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  qrIconContainer: {
    marginBottom: 32,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
  },
  startScanTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  startScanText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startScanButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startScanButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  instructionContainer: {
    padding: 20,
    backgroundColor: colors.white,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  rescanButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rescanButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  noPermissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  noPermissionSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark,
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 15,
    color: colors.dark,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  qrDataContainer: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  qrDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  qrDataText: {
    fontSize: 13,
    color: '#64748b',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
