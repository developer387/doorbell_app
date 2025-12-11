import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WebScannerScreen from '../screens/WebScannerScreen';
import WebGuestScreen from '../screens/WebGuestScreen';
import WebErrorScreen from '../screens/WebErrorScreen';
import WebPropertyUnavailableScreen from '../screens/WebPropertyUnavailableScreen';

const Stack = createNativeStackNavigator();

const linking = {
    prefixes: ['http://localhost:8081', 'doorbell://'],
    config: {
        screens: {
            Scanner: '',
            Guest: 'guests',
            Error: 'error',
        },
    },
};

export default function WebNavigator() {
    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Scanner" component={WebScannerScreen} />
                <Stack.Screen name="Guest" component={WebGuestScreen} />
                <Stack.Screen name="Unavailable" component={WebPropertyUnavailableScreen} />
                <Stack.Screen name="Error" component={WebErrorScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
