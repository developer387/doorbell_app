import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
// @ts-expect-error - React Native persistence types are not fully compatible
import { initializeAuth, getReactNativePersistence, getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
        console.error('Firebase API Key is missing. Check your .env file and ensure EXPO_PUBLIC_FIREBASE_API_KEY is set.');
    }
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch {
    auth = getAuth(app);
}

const db: Firestore = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
