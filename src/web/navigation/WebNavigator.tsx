import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WebWelcomeScreen from '../screens/WebWelcomeScreen';
import WebGuestScreen from '../screens/WebGuestScreen';
import WebErrorScreen from '../screens/WebErrorScreen';
import WebPropertyUnavailableScreen from '../screens/WebPropertyUnavailableScreen';
import Web404Screen from '../screens/Web404Screen';

const Stack = createNativeStackNavigator();

const linking = {
    prefixes: ['http://localhost:8081', 'https://doorbell.guestregistration.com', 'doorbell://'],
    config: {
        screens: {
            Welcome: {
                path: ':uuid?',
            },
            Guest: 'guests',
            Error: 'error',
            Unavailable: 'unavailable',
            NotFound: '*',
        },
    },
};

export default function WebNavigator() {
    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName="Welcome"
            >
                <Stack.Screen name="Welcome" component={WebWelcomeScreen} />
                <Stack.Screen name="Guest" component={WebGuestScreen} />
                <Stack.Screen name="Unavailable" component={WebPropertyUnavailableScreen} />
                <Stack.Screen name="Error" component={WebErrorScreen} />
                <Stack.Screen name="NotFound" component={Web404Screen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
