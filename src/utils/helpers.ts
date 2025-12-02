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
 * Uses expo-location's built-in reverse geocoding for reliability
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<string> => {
    try {
        const result = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
        });

        if (result && result.length > 0) {
            const address = result[0];

            // Build a formatted address string from the components
            const parts: string[] = [
                address.streetNumber,
                address.street,
                address.city,
                address.region,
                address.postalCode,
                address.country,
            ].filter((part): part is string => Boolean(part)); // Remove null/undefined values

            if (parts.length > 0) {
                return parts.join(', ');
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
