import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export interface AuthStackParamList {
    SignIn: undefined;
    Signup: undefined;
}

export interface MainStackParamList {
    Home: undefined;
    Profile: undefined;
    Settings: undefined;
}

export type RootStackParamList = AuthStackParamList & MainStackParamList;

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export interface AuthContextType {
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
}
