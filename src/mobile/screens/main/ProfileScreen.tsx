import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES } from '@constants/theme';
import { useAuth } from '@/context/UserContext';
import { User, MessageCircle, Bell, Trash2, LogOut, ChevronRight } from 'lucide-react-native';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, showChevron = true, isLast = false }) => (
  <TouchableOpacity
    style={[styles.menuItem, !isLast && styles.menuItemBorder]}
    onPress={onPress}
  >
    <View style={styles.menuItemContent}>
      {icon}
      <Text style={styles.menuItemLabel}>{label}</Text>
    </View>
    {showChevron && <ChevronRight size={20} color={COLORS.gray} />}
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This feature is coming soon.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header with Help */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => Alert.alert('Help', 'Support is coming soon.')}>
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Profile</Text>
          <Text style={styles.screenSubtitle}>All that we know about you</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={<User size={24} color={COLORS.dark} />}
            label="Account"
            onPress={() => Alert.alert('Account', 'Account settings coming soon.')}
          />
          <MenuItem
            icon={<MessageCircle size={24} color={COLORS.dark} />}
            label="FAQ"
            onPress={() => Alert.alert('FAQ', 'FAQ section coming soon.')}
          />
          <MenuItem
            icon={<Bell size={24} color={COLORS.dark} />}
            label="Notification"
            onPress={() => Alert.alert('Notifications', 'Notification settings coming soon.')}
          />
          <MenuItem
            icon={<Trash2 size={24} color={COLORS.dark} />}
            label="Delete my account and data"
            onPress={handleDeleteAccount}
          />

          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} disabled={isLoggingOut}>
              <View style={styles.menuItemContent}>
                <LogOut size={24} color={COLORS.dark} />
                <Text style={styles.menuItemLabel}>Log out</Text>
              </View>
              {isLoggingOut && <ActivityIndicator size="small" color={COLORS.dark} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 0.0.1</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  helpText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: SPACING.xl,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
  },
  menuContainer: {
    marginTop: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    backgroundColor: COLORS.white,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 18,
    color: COLORS.dark,
    fontWeight: '500',
    marginLeft: 16,
  },
  logoutContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footer: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  versionText: {
    color: COLORS.gray,
    fontSize: 14,
  },
});
