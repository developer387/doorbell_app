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
        const apiKey = 'AIzaSyBgCI4ytUMkGRq70mYAnC8febOjz7UyJDc';
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            return data.results[0].formatted_address;
        }

        // Fallback to coordinates if no address found
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        // Return coordinates as fallback
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
};
