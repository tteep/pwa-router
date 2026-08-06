import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/AppColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: COLORS.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          color: COLORS.text,
          fontSize: 17,
          fontWeight: '600',
          fontFamily: 'SpaceGrotesk_600SemiBold',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
          maxWidth: 280,
          fontFamily: 'SpaceGrotesk_400Regular',
        }}
      >
        {subtitle}
      </Text>
      {ctaLabel && onCta && (
        <AnimatedPressable
          onPress={() => {
            console.log('[EmptyState] CTA pressed:', ctaLabel);
            onCta();
          }}
          style={{
            marginTop: 8,
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'SpaceGrotesk_600SemiBold',
            }}
          >
            {ctaLabel}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}
