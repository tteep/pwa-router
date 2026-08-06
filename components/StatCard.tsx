import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/AppColors';

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
}

export function StatCard({ icon, value, label, color = COLORS.primary }: StatCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
        minHeight: 100,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          color: COLORS.text,
          fontSize: 24,
          fontWeight: '700',
          fontFamily: 'SpaceGrotesk_700Bold',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 12,
          fontFamily: 'SpaceGrotesk_400Regular',
          lineHeight: 16,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
