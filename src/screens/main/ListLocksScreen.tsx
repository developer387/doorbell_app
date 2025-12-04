import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type MainStackParamList } from '@navigation-types';
import { colors } from '@/styles/colors';

type RouteProps = RouteProp<MainStackParamList, 'ListLocks'>;

export const ListLocksScreen = () => {
    const route = useRoute<RouteProps>();
    const { deviceId } = route.params;

    useEffect(() => {
        console.log('ListLocksScreen mounted with deviceId:', deviceId);
    }, [deviceId]);

    return (
        <View style={styles.container}>
            <Text style={styles.text}>List Locks Screen</Text>
            <Text style={styles.detailText}>Device ID: {deviceId}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.dark,
        marginBottom: 10,
    },
    detailText: {
        fontSize: 16,
        color: colors.dark,
    },
});
