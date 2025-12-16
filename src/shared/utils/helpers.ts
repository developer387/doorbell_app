import * as Location from 'expo-location';

/**
 * Generate a UUID v4
 * This is a simple implementation for mobile use
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Reverse geocode coordinates to get address
 * Uses Google Geocoding API via HTTP request
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<string> => {
    try {
        const result = await Location.reverseGeocodeAsync({
            latitude,
            longitude
        });

        if (result.length > 0) {
            const addr = result[0];
            const addressParts = [
                addr.streetNumber,
                addr.street,
                addr.city,
                addr.region,
                addr.postalCode,
                addr.country
            ].filter(part => part && part !== '');

            if (addressParts.length > 0) {
                // simple join
                return addressParts.join(', ');
            }
        }

        // Fallback to coordinates if no address found
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        // Return coordinates as fallback
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
};
