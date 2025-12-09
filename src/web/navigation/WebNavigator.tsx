import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WebScannerScreen from '../screens/WebScannerScreen';
import WebGuestScreen from '../screens/WebGuestScreen';

const Stack = createNativeStackNavigator();

const linking = {
    prefixes: ['http://localhost:8081', 'doorbell://'],
    config: {
        screens: {
            Scanner: '',
            Guest: 'guests',
        },
    },
};

export default function WebNavigator() {
    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Scanner" component={WebScannerScreen} />
                <Stack.Screen name="Guest" component={WebGuestScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
