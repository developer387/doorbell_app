import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA27g83mAIEBr5sz7vn0D-4J-Dy4OZtPvg",
    authDomain: "doorbell-app-toks.firebaseapp.com",
    projectId: "doorbell-app-toks",
    storageBucket: "doorbell-app-toks.firebasestorage.app",
    messagingSenderId: "142583077920",
    appId: "1:142583077920:web:5f758d0e386c2aa18e3045"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

try {
    // Initialize Auth with AsyncStorage persistence for React Native
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch (e) {
    // If auth is already initialized, get the existing instance
    // This handles hot reload scenarios
    auth = getAuth(app);
}

db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
