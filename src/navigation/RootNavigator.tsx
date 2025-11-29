import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useUser } from '@/context/UserContext';
import { COLORS } from '@/constants/theme';

export const RootNavigator: React.FC = () => {
    const { isLoggedIn, isLoading } = useUser();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};
