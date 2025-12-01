import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MediumText, SmallText } from '@/typography';
import { colors } from '@/styles/colors';

export const FilterChips = () => {
  const [active, setActive] = useState<string>('All Property');

  const chips = [
    { label: 'All Property' },
    { label: 'Houses', icon: '🏠' },
    { label: 'Vehicles', icon: '🚗', badge: 'New' },
  ];

  return (
    <View style={styles.filterContent}>
      {chips.map((chip) => {
        const isActive = active === chip.label;

        return (
          <Pressable
            key={chip.label}
            onPress={() => setActive(chip.label)}
            style={[styles.chip, isActive && styles.activeChip]}
          >
            {chip.icon && (
              <SmallText style={[styles.chipIcon, isActive && { color: colors.white }]}>
                {chip.icon}
              </SmallText>
            )}
            <MediumText variant={isActive ? 'white' : 'black'}>{chip.label}</MediumText>
            {chip.badge && isActive && (
              <View style={styles.badge}>
                <SmallText variant="white">{chip.badge}</SmallText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  filterContent: {
    flexDirection: 'row',
    marginTop: 10,
    paddingVertical: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 12,
    marginRight: 3,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.tag,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 5,
  },
});
