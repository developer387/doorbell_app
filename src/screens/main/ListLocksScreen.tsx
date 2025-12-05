import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { type MainStackParamList } from '@navigation-types';
import { colors } from '@/styles/colors';
import { Title, Body } from '@/typography';

type RouteProps = RouteProp<MainStackParamList, 'ListLocks'>;

export const ListLocksScreen = () => {
    const route = useRoute<RouteProps>();
    const { deviceId } = route.params;

    useEffect(() => {
        console.log('ListLocksScreen mounted with deviceId:', deviceId);
    }, [deviceId]);

    return (
        <View style={styles.container}>
            <Title weight="bolder" variant="black" align="center">List Locks Screen</Title>
            <Body variant="black" align="center">Device ID: {deviceId}</Body>
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
