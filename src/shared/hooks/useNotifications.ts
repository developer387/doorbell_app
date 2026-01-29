import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
    configureNotifications,
    registerForPushNotifications,
    storeDeviceToken,
    removeDeviceToken,
    addNotificationReceivedListener,
    addNotificationResponseReceivedListener,
    NotificationData,
} from '../services/notifications.service';

interface UseNotificationsOptions {
    userId?: string | null;
    onNotificationReceived?: (data: NotificationData) => void;
    onNotificationTapped?: (data: NotificationData) => void;
}

export const useNotifications = (options: UseNotificationsOptions) => {
    const { userId, onNotificationReceived, onNotificationTapped } = options;
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const previousUserId = useRef<string | null>(null);

    // Configure notifications on mount
    useEffect(() => {
        if (Platform.OS === 'web') return;
        configureNotifications();
    }, []);

    // Register for push notifications when user logs in
    useEffect(() => {
        if (Platform.OS === 'web') return;
        if (!userId) {
            // User logged out - clean up token
            if (previousUserId.current) {
                removeDeviceToken(previousUserId.current);
                previousUserId.current = null;
            }
            setPushToken(null);
            setIsRegistered(false);
            return;
        }

        const register = async () => {
            const token = await registerForPushNotifications();
            if (token) {
                setPushToken(token);
                await storeDeviceToken(userId, token);
                setIsRegistered(true);
                previousUserId.current = userId;
            }
        };

        register();
    }, [userId]);

    // Set up notification listeners
    useEffect(() => {
        if (Platform.OS === 'web') return;

        // Handle notification received while app is foregrounded
        const receivedSubscription = addNotificationReceivedListener((notification) => {
            console.log('[useNotifications] Notification received:', notification);
            const data = notification.request.content.data as NotificationData;
            onNotificationReceived?.(data);
        });

        // Handle notification tapped (app opened from notification)
        const responseSubscription = addNotificationResponseReceivedListener((response) => {
            console.log('[useNotifications] Notification tapped:', response);
            const data = response.notification.request.content.data as NotificationData;
            onNotificationTapped?.(data);
        });

        return () => {
            receivedSubscription.remove();
            responseSubscription.remove();
        };
    }, [onNotificationReceived, onNotificationTapped]);

    return {
        pushToken,
        isRegistered,
    };
};
