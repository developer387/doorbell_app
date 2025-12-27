import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { ArrowLeft, MapPin, QrCode } from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Heading, Body, MediumText, Title } from '@/typography';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';
import { useAuth } from '@/context/UserContext';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components';

import { generateUUID, reverseGeocode } from '@/utils/helpers';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const AddPropertyScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const { user } = useAuth();

  const [propertyId, setPropertyId] = useState<string>('');
  const [scannedUrl, setScannedUrl] = useState<string>(''); // specific URL storage

  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);

    // Normalize data
    const trimmedData = data.trim();
    let uuid = trimmedData;
    let finalUrl = trimmedData;

    // Check if the data is a URL with the format https://doorbell.guestregistration.com/<UUID>
    if (trimmedData.includes('doorbell.guestregistration.com')) {
      const parts = trimmedData.split('/');
      uuid = parts[parts.length - 1];
    } else {
      // If it's just a UUID, construct the URL to enforce the format
      finalUrl = `https://doorbell.guestregistration.com/${trimmedData}`;
    }

    try {
      // Check if this property already exists by the strictly formatted URL
      const q = query(collection(db, 'properties'), where('qrCodeUUID', '==', finalUrl));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setScanError('QR code already has a property');
        Alert.alert('Error', 'QR code already has a property');

        // Clear fields
        setPropertyId('');
        setScannedUrl('');
        setPropertyName('');
        setAddress('');
        setLocation(null);
        return;
      }

      setScanError(null);
      setPropertyId(uuid);
      setScannedUrl(finalUrl);
      setCameraActive(false);
      setShowForm(true);
    } catch (error) {
      console.error('Error checking property existence:', error);
      Alert.alert('Error', 'Failed to validate QR code. Please try again.');
      setScanned(false);
      setScanError(null);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use this feature. Please enable it in your device settings.'
        );
        setLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      const { latitude, longitude } = currentLocation.coords;

      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates received');
      }

      setLocation({ latitude, longitude });

      const addressString = await reverseGeocode(latitude, longitude);

      if (!addressString) {
        throw new Error('Failed to retrieve address');
      }

      setAddress(addressString);
      setLoadingLocation(false);

      Alert.alert(
        'Location Retrieved',
        'Your current location has been successfully retrieved and converted to an address.'
      );
    } catch (error) {
      console.error('Error getting location:', error);

      let errorMessage = 'Failed to get current location. ';

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage += 'Location request timed out. Please ensure GPS is enabled and try again.';
        } else if (error.message.includes('Invalid coordinates')) {
          errorMessage += 'Received invalid location data. Please try again.';
        } else if (error.message.includes('address')) {
          errorMessage += 'Could not convert location to address. Please enter manually.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please ensure location services are enabled and try again.';
      }

      Alert.alert('Error', errorMessage);
      setLoadingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a property');
      return;
    }

    try {
      setIsSubmitting(true);
      const id = propertyId || generateUUID();
      setPropertyId(id);

      const propertyData = {
        propertyId: id,
        category: 'Property',
        propertyName: propertyName || null,
        address: address || null,
        location: location || null,
        smartLocks: null,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        qrCodeUUID: scannedUrl || `https://doorbell.guestregistration.com/${id}`, // Store the full URL
        allowGuest: false, // Default to false when property is created
      };

      // Save property directly to Firestore
      await addDoc(collection(db, 'properties'), propertyData);

      // Navigate directly to LinkSmartLock screen
      navigation.navigate('LinkSmartLock', { propertyId: id });

    } catch (error) {
      console.error('Error saving property:', error);
      Alert.alert('Error', 'Failed to save property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        <Heading weight="bold" variant="black" align="center">No access to camera</Heading>
        <Body variant="secondary" align="center">
          Please enable camera permissions in your device settings
        </Body>
      </View>
    );
  }

  if (cameraActive && !showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCameraActive(false)} style={styles.closeButton}>
            <ArrowLeft size={24} color={colors.dark} />
          </TouchableOpacity>
          <Heading weight="bold" variant="black">Scan QR Code</Heading>
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
          <Body weight="bold" variant="black" align="center">Position the QR code in the frame</Body>
          <MediumText variant="secondary" align="center">
            Align the QR code within the frame to scan automatically
          </MediumText>
        </View>


        {scanned && (
          <View style={{ alignItems: 'center', width: '100%' }}>
            {scanError && (
              <Body variant="primary" weight="bold" align="center" style={{ marginBottom: 16, color: colors.error }}>
                {scanError}
              </Body>
            )}
            <Button
              title="Scan Again"
              onPress={() => {
                setScanned(false);
                setPropertyId('');
                setShowForm(false);
                setScanError(null);
              }}
              style={{ width: 'auto', minWidth: 150 }}
            />
          </View>
        )}
      </View>
    );
  }

  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <ArrowLeft size={24} color={colors.dark} />
          </TouchableOpacity>
          <Heading weight="bold" variant="black">Add Property</Heading>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <MediumText variant="secondary">Enter your property details</MediumText>



          <View style={styles.inputGroup}>
            <MediumText weight="normal" variant="black">Property name</MediumText>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Property name"
                placeholderTextColor={colors.slate400}
                value={propertyName}
                onChangeText={setPropertyName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <MediumText weight="normal" variant="black">Address</MediumText>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Address"
                placeholderTextColor={colors.slate400}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseCurrentLocation}
              disabled={loadingLocation}
            >
              <MapPin size={16} color={colors.primary} />
              <MediumText variant="primary">
                {loadingLocation ? 'Getting location...' : 'Use Current Location'}
              </MediumText>
            </TouchableOpacity>
          </View>

          {location && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Property Location"
                />
              </MapView>
            </View>
          )}

          <Button
            title="Proceed"
            onPress={handleSubmit}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            style={{ marginBottom: 40 }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <ArrowLeft size={24} color={colors.dark} />
        </TouchableOpacity>
        <Heading weight="bold" variant="black">Add Property</Heading>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.startScanContainer}>
        <View style={styles.qrIconContainer}>
          <QrCode size={80} color={colors.primary} strokeWidth={1.5} />
        </View>

        <Title weight="bold" variant="black" align="center">Scan Property QR Code</Title>
        <Body variant="secondary" align="center">
          To add a new property, you need to scan the QR code provided with your doorbell device.
        </Body>

        <Button
          title="Start Scanning"
          onPress={handleStartScanning}
          leftIcon={<QrCode size={20} color={colors.white} />}
        />
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
    backgroundColor: colors.green50,
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
    color: colors.slate500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
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
    color: colors.slate500,
    textAlign: 'center',
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
    color: colors.slate500,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate500,
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
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  map: {
    flex: 1,
  },
});
