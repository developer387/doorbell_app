import React from 'react';
import { ScrollableChipList } from '@components/ScrollableChipList';
import { type LucideIcon } from 'lucide-react-native';

interface ChipItem {
  label: string;
  value: string;
  icon?: string | LucideIcon;
  badge?: string;
  count?: number;
}

export interface FilterChipsProps {
  items?: ChipItem[];
  activeItem?: string;
  onItemPress?: (item: ChipItem) => void
}

export const FilterChips = ({ items, activeItem, onItemPress }: FilterChipsProps) => {


  return (
    <ScrollableChipList
      items={items}
      activeItem={activeItem}
      onItemPress={onItemPress}
      buttonType="filled"
      showCounts={true}
    />
  );
};
