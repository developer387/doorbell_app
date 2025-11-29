import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
    Signup: undefined;
    Login: undefined;
};

export type MainStackParamList = {
    Home: undefined;
    Profile: undefined;
    Settings: undefined;
};

export type RootStackParamList = AuthStackParamList & MainStackParamList;

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export interface AuthContextType {
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
}
