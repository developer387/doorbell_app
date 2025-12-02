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
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<string> => {
    try {
        // Using a simple OpenStreetMap Nominatim API for reverse geocoding
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        return data.display_name || `${latitude}, ${longitude}`;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        return `${latitude}, ${longitude}`;
    }
};
