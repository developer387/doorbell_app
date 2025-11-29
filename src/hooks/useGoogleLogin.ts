import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useGoogleLogin = () => {
    // In Expo Go, we must use the Web Client ID for all platforms to enable the web-based proxy authentication flow.
    // Native Client IDs (Android/iOS) only work in standalone builds (APK/IPA) with matching package names.
    const webClientId = '142583077920-1mavafe4dibirf33hh1m8hd8hoqtv3jl.apps.googleusercontent.com';

    // Expo Auth Proxy URL - must match your Expo username and app slug
    // Format: https://auth.expo.io/@{username}/{slug}
    const redirectUri = 'https://auth.expo.io/@marcusmith/doorbell_app';

    console.log('🔗 Using Redirect URI:', redirectUri);

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: webClientId,
        // We use the Web Client ID for Android/iOS in Expo Go to avoid "redirect_uri_mismatch" and "must be defined" errors.
        androidClientId: webClientId,
        iosClientId: webClientId,
        redirectUri: redirectUri,
        responseType: ResponseType.IdToken,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleSignIn = async () => {
            console.log('🔍 Auth Response:', response);

            if (response?.type === 'success') {
                console.log('✅ Success response received');
                console.log('📦 Response params:', response.params);

                const { id_token } = response.params;

                if (!id_token) {
                    console.error('❌ No ID token found in response params');
                    setError('No ID token received from Google');
                    return;
                }

                console.log('🔑 ID Token received (length):', id_token.length);

                const credential = GoogleAuthProvider.credential(id_token);
                setIsLoading(true);
                setError(null);

                try {
                    console.log('🔐 Attempting Firebase sign in...');
                    const userCredential = await signInWithCredential(auth, credential);
                    console.log('✅ Firebase sign in successful!', userCredential.user.email);
                } catch (err: any) {
                    console.error('❌ Firebase sign in error:', err);
                    setError(err.message || 'Failed to sign in with Firebase');
                } finally {
                    setIsLoading(false);
                }
            } else if (response?.type === 'error') {
                console.error('❌ Google sign in error:', response.error);
                setError(response.error?.message || 'Google sign in failed');
            } else if (response?.type === 'cancel') {
                console.log('⚠️ User cancelled the sign in');
            }
        };

        if (response) {
            handleSignIn();
        }
    }, [response]);

    return {
        promptAsync,
        request,
        isLoading: isLoading,
        error,
    };
};
