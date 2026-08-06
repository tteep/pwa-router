import React from 'react';
import { View, Text } from 'react-native';
import { INTENT_META } from '@/utils/intent-parser';

interface IntentBadgeProps {
  type: string;
  size?: 'sm' | 'md';
}

export function IntentBadge({ type, size = 'md' }: IntentBadgeProps) {
  const meta = INTENT_META[type] ?? INTENT_META.custom;
  const color = meta.color;
  const label = meta.label;

  const isSmall = size === 'sm';
  const fontSize = isSmall ? 10 : 11;
  const paddingH = isSmall ? 6 : 8;
  const paddingV = isSmall ? 2 : 3;

  return (
    <View
      style={{
        backgroundColor: `${color}20`,
        borderRadius: 6,
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        borderWidth: 1,
        borderColor: `${color}40`,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color,
          fontSize,
          fontWeight: '600',
          letterSpacing: 0.3,
          fontFamily: 'SpaceGrotesk_600SemiBold',
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
