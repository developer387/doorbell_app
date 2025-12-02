import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';
import { SettingsScreen, AddPropertyScreen, LinkSmartLockScreen } from '@screens/main';
import { TabNavigator } from './TabNavigator';
import { COLORS } from '@constants/theme';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTintColor: COLORS.dark,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="LinkSmartLock"
        component={LinkSmartLockScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};
