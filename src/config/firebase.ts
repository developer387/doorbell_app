import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

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

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

auth = getAuth(app);

export { app, auth };
