import { Platform } from 'react-native';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Conditionally import expo-notifications and expo-device only on native
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (Platform.OS !== 'web') {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
}

export interface NotificationData {
    propertyId?: string;
    propertyName?: string;
    requestId?: string;
    type?: 'incoming_call' | 'missed_call';
}

/**
 * Configure notification behavior
 */
export const configureNotifications = () => {
    if (!Notifications) return;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
};

/**
 * Request notification permissions and get push token
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
        console.log('[Notifications] Push notifications not supported on web');
        return null;
    }

    if (!Notifications || !Device) {
        console.log('[Notifications] Notifications module not available');
        return null;
    }

    // Check if running on physical device
    if (!Device.isDevice) {
        console.log('[Notifications] Push notifications require a physical device');
        return null;
    }

    try {
        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Request permissions if not granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('[Notifications] Permission not granted');
            return null;
        }

        // Get the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'b264a3ec-0712-4ea2-a5c5-a353f7dbbe6a', // From app.config.ts
        });

        console.log('[Notifications] Push token:', tokenData.data);
        return tokenData.data;
    } catch (error) {
        console.error('[Notifications] Error getting push token:', error);
        return null;
    }
};

/**
 * Store the device push token in Firestore for the user
 */
export const storeDeviceToken = async (userId: string, token: string): Promise<void> => {
    if (!userId || !token) return;

    try {
        await setDoc(doc(db, 'userDeviceTokens', userId), {
            token,
            platform: Platform.OS,
            updatedAt: new Date().toISOString(),
        });
        console.log('[Notifications] Device token stored for user:', userId);
    } catch (error) {
        console.error('[Notifications] Error storing device token:', error);
    }
};

/**
 * Remove device token when user logs out
 */
export const removeDeviceToken = async (userId: string): Promise<void> => {
    if (!userId) return;

    try {
        await deleteDoc(doc(db, 'userDeviceTokens', userId));
        console.log('[Notifications] Device token removed for user:', userId);
    } catch (error) {
        console.error('[Notifications] Error removing device token:', error);
    }
};

/**
 * Get notification listeners for handling notification events
 */
export const addNotificationReceivedListener = (
    callback: (notification: import('expo-notifications').Notification) => void
) => {
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseReceivedListener = (
    callback: (response: import('expo-notifications').NotificationResponse) => void
) => {
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Schedule a local notification (for testing)
 */
export const scheduleLocalNotification = async (
    title: string,
    body: string,
    data?: NotificationData
) => {
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data as Record<string, unknown>,
            sound: true,
        },
        trigger: null, // Immediate
    });
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number) => {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
    if (!Notifications) return;
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
};
