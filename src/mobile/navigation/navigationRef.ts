import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from '@navigation-types';

export const navigationRef = createNavigationContainerRef<MainStackParamList>();

export function navigate(name: keyof MainStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    // Queue the navigation for when the navigator is ready
    console.log('[Navigation] Navigator not ready, queuing navigation to:', name);
  }
}
