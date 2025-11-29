import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@navigation-types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@constants/theme';

interface HomeScreenProps {
    navigation: NativeStackNavigationProp<MainStackParamList, 'Home'>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Hello, User! 👋</Text>
                <Text style={styles.subtitle}>Welcome to your dashboard</Text>
            </View>

            <View style={styles.statsContainer}>
                <StatCard title="Projects" value="12" color={COLORS.primary} />
                <StatCard title="Tasks" value="48" color={COLORS.success} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => {
                        navigation.navigate('Profile');
                    }}
                >
                    <View style={styles.actionIconContainer}>
                        <Text style={styles.actionIcon}>👤</Text>
                    </View>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>View Profile</Text>
                        <Text style={styles.actionDescription}>Manage your account settings</Text>
                    </View>
                    <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => {
                        navigation.navigate('Settings');
                    }}
                >
                    <View style={styles.actionIconContainer}>
                        <Text style={styles.actionIcon}>⚙️</Text>
                    </View>
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Settings</Text>
                        <Text style={styles.actionDescription}>Configure your preferences</Text>
                    </View>
                    <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    You are viewing the authenticated user interface. Change{' '}
                    <Text style={styles.code}>IS_LOGGED_IN</Text> to{' '}
                    <Text style={styles.code}>false</Text> in{' '}
                    <Text style={styles.code}>src/constants/theme.ts</Text> to see the welcome screen.
                </Text>
            </View>
        </ScrollView>
    );
};

interface StatCardProps {
    title: string;
    value: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        padding: SPACING.lg,
    },
    header: {
        marginBottom: SPACING.xl,
    },
    greeting: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: FONT_SIZES.md,
        color: COLORS.gray,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderLeftWidth: 4,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: SPACING.xs,
    },
    statTitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.gray,
        fontWeight: '500',
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: SPACING.md,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    actionIcon: {
        fontSize: FONT_SIZES.xl,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: SPACING.xs,
    },
    actionDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.gray,
    },
    actionArrow: {
        fontSize: FONT_SIZES.xxl,
        color: COLORS.gray,
        fontWeight: '300',
    },
    infoBox: {
        backgroundColor: COLORS.info,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.md,
    },
    infoText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.white,
        lineHeight: 18,
    },
    code: {
        fontFamily: 'monospace',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        fontWeight: '600',
    },
});
