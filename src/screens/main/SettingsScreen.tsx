import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '@constants/theme';
import { Heading, Body, MediumText } from '@/typography';

export const SettingsScreen: React.FC = () => {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.section}>
                <Heading weight="bold" variant="black">Notifications</Heading>

                <View style={styles.settingsCard}>
                    <SettingRow
                        label="Push Notifications"
                        description="Receive push notifications"
                        value={pushEnabled}
                        onValueChange={setPushEnabled}
                    />
                    <SettingRow
                        label="Email Notifications"
                        description="Receive email updates"
                        value={emailEnabled}
                        onValueChange={setEmailEnabled}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Heading weight="bold" variant="black">Appearance</Heading>

                <View style={styles.settingsCard}>
                    <SettingRow
                        label="Dark Mode"
                        description="Use dark theme"
                        value={darkMode}
                        onValueChange={setDarkMode}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Heading weight="bold" variant="black">About</Heading>

                <View style={styles.settingsCard}>
                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Body weight="bold" variant="black">Version</Body>
                        </View>
                        <MediumText variant="secondary">1.0.0</MediumText>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Body weight="bold" variant="black">Terms of Service</Body>
                        </View>
                        <Heading variant="secondary" weight="light">›</Heading>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Body weight="bold" variant="black">Privacy Policy</Body>
                        </View>
                        <Heading variant="secondary" weight="light">›</Heading>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

interface SettingRowProps {
    label: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, value, onValueChange }) => (
    <View style={styles.settingItem}>
        <View style={styles.settingContent}>
            <Body weight="bold" variant="black">{label}</Body>
            <MediumText variant="secondary">{description}</MediumText>
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: COLORS.gray, true: COLORS.primary }}
            thumbColor={COLORS.white}
        />
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
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: SPACING.md,
    },
    settingsCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    settingContent: {
        flex: 1,
        marginRight: SPACING.md,
    },
    settingLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: SPACING.xs,
    },
    settingDescription: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.gray,
    },
    settingValue: {
        fontSize: FONT_SIZES.md,
        color: COLORS.gray,
        fontWeight: '500',
    },
    settingArrow: {
        fontSize: FONT_SIZES.xxl,
        color: COLORS.gray,
        fontWeight: '300',
    },
});
