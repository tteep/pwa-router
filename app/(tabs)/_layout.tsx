import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/AppColors';
import { Dimensions } from 'react-native';

export const unstable_settings = {
  initialRouteName: '(dashboard)',
};

const { width: screenWidth } = Dimensions.get('window');

const TABS = [
  {
    name: '(dashboard)',
    route: '/(tabs)/(dashboard)' as const,
    icon: 'home' as const,
    label: 'Dashboard',
  },
  {
    name: '(rules)',
    route: '/(tabs)/(rules)' as const,
    icon: 'rule' as const,
    label: 'Rules',
  },
  {
    name: '(apps)',
    route: '/(tabs)/(apps)' as const,
    icon: 'apps' as const,
    label: 'Apps',
  },
  {
    name: '(settings)',
    route: '/(tabs)/(settings)' as const,
    icon: 'settings' as const,
    label: 'Settings',
  },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Slot />
      <FloatingTabBar
        tabs={TABS}
        containerWidth={screenWidth * 0.88}
        borderRadius={28}
        bottomMargin={16}
      />
    </View>
  );
}
