import React from 'react';
import { View, Text, Switch } from 'react-native';
import { COLORS, INTENT_COLORS } from '@/constants/AppColors';
import { IntentBadge } from '@/components/IntentBadge';
import { InstalledApp } from '@/contexts/RoutingContext';

interface AppCardProps {
  app: InstalledApp;
  onToggle: (enabled: boolean) => void;
}

export function AppCard({ app, onToggle }: AppCardProps) {
  const color = INTENT_COLORS[app.intent_type] ?? COLORS.primary;
  const initial = (app.display_name[0] ?? '?').toUpperCase();

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: `${color}30`,
        }}
      >
        <Text
          style={{
            color,
            fontSize: 18,
            fontWeight: '700',
            fontFamily: 'SpaceGrotesk_700Bold',
          }}
        >
          {initial}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 14,
            fontWeight: '600',
            fontFamily: 'SpaceGrotesk_600SemiBold',
          }}
          numberOfLines={1}
        >
          {app.display_name}
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontFamily: 'SpaceGrotesk_400Regular',
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {app.package_name}
        </Text>
        <IntentBadge type={app.intent_type} size="sm" />
      </View>
      <Switch
        value={app.is_enabled}
        onValueChange={(val) => {
          console.log('[AppCard] toggle app:', app.id, val);
          onToggle(val);
        }}
        trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.accent}80` }}
        thumbColor={app.is_enabled ? COLORS.accent : COLORS.textTertiary}
        ios_backgroundColor={COLORS.surfaceElevated}
      />
    </View>
  );
}
