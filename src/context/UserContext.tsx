import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

const USER_STORAGE_KEY = '@doorbell_user';

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from AsyncStorage on mount
    useEffect(() => {
        const loadUserFromStorage = async () => {
            try {
                const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
                if (storedUser) {
                    // Note: We don't set the user here, we let onAuthStateChanged handle it
                    // This just ensures we check if there's persisted data
                }
            } catch (error) {
                console.error('Error loading user from storage:', error);
            }
        };

        loadUserFromStorage();
    }, []);

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);

            // Persist user to AsyncStorage
            if (currentUser) {
                try {
                    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                    }));
                } catch (error) {
                    console.error('Error persisting user to storage:', error);
                }
            } else {
                try {
                    await AsyncStorage.removeItem(USER_STORAGE_KEY);
                } catch (error) {
                    console.error('Error removing user from storage:', error);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            setUser(userCredential.user);
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        try {
            // Create user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            // Save user data to Firestore
            await setDoc(doc(db, 'users', newUser.uid), {
                uid: newUser.uid,
                name,
                email,
                createdAt: new Date().toISOString(),
            });

            setUser(newUser);
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    const setIsLoggedIn = (isLoggedIn: boolean) => {
        // This is a controlled setter for compatibility
        // The actual isLoggedIn state is derived from user
        if (!isLoggedIn) {
            setUser(null);
        }
    };

    const value = {
        user,
        isLoggedIn: !!user,
        isLoading,
        setUser,
        setIsLoggedIn,
        login,
        signup,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export for backward compatibility
export const UserProvider = AuthProvider;
export const useUser = useAuth;
