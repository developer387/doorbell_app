import React from 'react';
import { ScrollableChipList } from '@components/ScrollableChipList';

interface ChipItem {
  label: string;
  value: string;
  icon?: string;
  badge?: string;
  count?: number;
}

export interface FilterChipsProps {
  items?: ChipItem[];
}

export const FilterChips = ({ items }: FilterChipsProps) => {


  return (
    <ScrollableChipList
      items={ items }
      onItemPress={() => {}}
      buttonType="filled"
      showCounts={true}
    />
  );
};
