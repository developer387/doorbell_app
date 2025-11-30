import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };
