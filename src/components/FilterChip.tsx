import React from 'react';

import { ScrollableChipList } from '@components/ScrollableChipList';

export const FilterChips = () => {

  const chips = [
    { label: 'All Property', value: 'All Property' },
    { label: 'Houses', value: 'Houses', icon: '🏠',  },
    { label: 'Vehicles', value: 'Vehicles', icon: '🚗',  badge: 'New' },
  ];

  return (
    <ScrollableChipList
      items={chips}
      onItemPress={() => {}}
      buttonType="filled"
      showCounts={true}
    />
  );
};

