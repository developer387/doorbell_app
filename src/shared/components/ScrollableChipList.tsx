import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, type ViewStyle, type TextStyle } from 'react-native';
import { MediumText, SmallText } from '@/typography';
import { colors } from '@/styles/colors';
import { type LucideIcon } from 'lucide-react-native';

export interface ChipItem {
  label: string;
  icon?: LucideIcon | string;
  count?: number;
  badge?: string;
  value: string;
}

interface ScrollableChipListProps {
  items?: ChipItem[];
  activeItem?: string;
  onItemPress?: (item: ChipItem) => void;
  buttonType?: 'filled' | 'outlined' | 'minimal';
  showIcons?: boolean;
  showCounts?: boolean;
  showBadges?: boolean;
  containerStyle?: ViewStyle;
  chipStyle?: ViewStyle;
  activeChipStyle?: ViewStyle;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
}

export const ScrollableChipList: React.FC<ScrollableChipListProps> = ({
  items,
  activeItem,
  onItemPress,
  buttonType = 'outlined',
  showIcons = true,
  showCounts = true,
  showBadges = true,
  containerStyle,
  chipStyle,
  activeChipStyle,
  textStyle,
  activeTextStyle,
}) => {
  const [internalActive, setInternalActive] = useState<string>(() => {
    if (!items?.length) return '';
    return items[0].value ?? items[0].label ?? '';
  });

  const active = activeItem ?? internalActive;

  const handlePress = (item: ChipItem) => {
    const value = item.value ?? item.label;
    setInternalActive(value);
    onItemPress?.(item);
  };

  const getChipStyles = (isActive: boolean) => {
    const baseStyles: ViewStyle[] = [styles.chip];

    if (buttonType === 'filled') {
      baseStyles.push(isActive ? styles.filledActive : styles.filledInactive);
    } else if (buttonType === 'outlined') {
      baseStyles.push(isActive ? styles.outlinedActive : styles.outlinedInactive);
    } else {
      baseStyles.push(isActive ? styles.minimalActive : styles.minimalInactive);
    }

    if (chipStyle) baseStyles.push(chipStyle);
    if (isActive && activeChipStyle) baseStyles.push(activeChipStyle);

    return baseStyles;
  };

  const getTextColor = (isActive: boolean): 'white' | 'black' => {
    if (buttonType === 'filled' && isActive) return 'white';
    if (buttonType === 'outlined' && isActive) return 'white';
    if (buttonType === 'minimal' && isActive) return 'black';
    return 'black';
  };

  const renderIcon = (item: ChipItem, isActive: boolean) => {
    if (!showIcons || !item.icon) return null;

    if (typeof item.icon === 'string') {
      return (
        <SmallText style={[styles.chipIcon, isActive && { color: colors.white }]}>
          {item.icon}
        </SmallText>
      );
    }

    const IconComponent = item.icon;
    const iconColor = isActive && buttonType !== 'minimal' ? colors.white : colors.text;
    return <IconComponent size={16} color={iconColor} />;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, containerStyle]}
      style={styles.scrollContainer}
    >
      {items?.map((item, index) => {
        const itemValue = item.value ?? item.label;
        const isActive = active === itemValue;

        return (
          <Pressable
            key={`${itemValue}-${index}`}
            onPress={() => handlePress(item)}
            style={getChipStyles(isActive)}
          >
            {renderIcon(item, isActive)}

            <MediumText
              variant={getTextColor(isActive)}
              style={[textStyle, isActive && activeTextStyle]}
            >
              {item.label}
            </MediumText>

            {showCounts && item.count !== undefined && (
              <View
                style={[
                  styles.countBadge,
                  isActive && { borderColor: colors.white },
                ]}
              >
                <SmallText
                  style={{ color: isActive ? colors.white : colors.textSecondary }}
                >
                  {item.count}
                </SmallText>
              </View>
            )}

            {showBadges && item.badge && (
              <View style={styles.badge}>
                <SmallText variant="white">{item.badge}</SmallText>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingRight: 16, // Add padding to the right so last item is fully visible
  },
  chip: {
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filledActive: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  filledInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderColor
  },
  outlinedActive: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlinedInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  // Minimal button styles
  minimalActive: {
    backgroundColor: colors.tagBg,
    borderWidth: 0,
  },
  minimalInactive: {
    borderWidth: 0,
  },
  chipIcon: {
    fontSize: 14,
    color: colors.text,
  },
  countBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.tag,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
