import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
// @ts-expect-error - React Native persistence types are not fully compatible
import { initializeAuth, getReactNativePersistence, getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDDl_KK66dksJ4cdY73LkN0rbjrD_AAox8",
    authDomain: "doorbell-165ac.firebaseapp.com",
    projectId: "doorbell-165ac",
    storageBucket: "doorbell-165ac.firebasestorage.app",
    messagingSenderId: "507464378158",
    appId: "1:507464378158:web:4830dc3fea451df24bbcbf"
};

let app: FirebaseApp;
let auth: Auth;

if (!getApps().length) {
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
