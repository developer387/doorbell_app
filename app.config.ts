import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: "Doorbell App",
    slug: "doorbell_app",
    version: "1.0.0",
    scheme: "doorbellapp",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#007AFF"
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.doorbell.app"
    },
    android: {
        adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#007AFF"
        },
        package: "com.doorbell.app",
        permissions: [
            "android.permission.CAMERA",
            "android.permission.RECORD_AUDIO"
        ],
        config: {
            googleMaps: {
                // Use environment variable to prevent submitting secrets to code
                apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
            }
        }
    },
    web: {
        favicon: "./assets/favicon.png"
    },
    plugins: [
        "expo-web-browser",
        "expo-video",
        [
            "expo-camera",
            {
                cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
                microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
                recordAudioAndroid: true
            }
        ],
        [
            "@config-plugins/react-native-webrtc",
            {
                cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
                microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone"
            }
        ],
        [
            "expo-notifications",
            {
                icon: "./assets/icon.png",
                color: "#007AFF",
                sounds: [],
                android: {
                    channelId: "doorbell-calls",
                    channelName: "Doorbell Calls",
                    channelDescription: "Notifications for incoming doorbell calls",
                    importance: 5,
                    vibrate: true,
                    sound: true
                }
            }
        ]
    ],
    extra: {
        eas: {
            projectId: "b264a3ec-0712-4ea2-a5c5-a353f7dbbe6a"
        }
    },
    owner: "lodge-compliance",
    jsEngine: "hermes"
});
