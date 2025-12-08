import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

export interface AuthStackParamList extends ParamListBase {
    SignIn: undefined;
    Signup: undefined;
}

export interface TabParamList extends ParamListBase {
    HomeTab: undefined;
    AddProperty: undefined;
    ProfileTab: undefined;
}

export interface MainStackParamList extends ParamListBase {
    MainTabs: undefined;
    Settings: undefined;
    AddProperty: undefined;
    LinkSmartLock: { propertyId: string };
    PropertyDetails: { propertyId: string };
    ListLocks: { deviceId: string };
    SetPropertyPin: {
        propertyData: {
            propertyId: string;
            category: string;
            propertyName: string | null;
            address: string | null;
            location: { latitude: number; longitude: number } | null;
            smartLocks: any;
            userId: string;
            createdAt: string;
        }
    };
}

export type RootStackParamList = AuthStackParamList & MainStackParamList;

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export interface AuthContextType {
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
}
