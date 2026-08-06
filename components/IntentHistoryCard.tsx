import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/AppColors';
import { IntentBadge } from '@/components/IntentBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export interface IntentHistoryItem {
  id: string;
  intent_type: string;
  destination_app: string | null;
  result: string;
  latency_ms: number | null;
  created_at: string;
  raw_data?: Record<string, unknown>;
  matched_rule_name?: string | null;
}

interface IntentHistoryCardProps {
  item: IntentHistoryItem;
  onPress: () => void;
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getResultColor(result: string): string {
  if (result === 'routed') return COLORS.accent;
  if (result === 'error') return COLORS.danger;
  return COLORS.warning;
}

export function IntentHistoryCard({ item, onPress }: IntentHistoryCardProps) {
  const resultColor = getResultColor(item.result);
  const relativeTime = getRelativeTime(item.created_at);
  const latencyDisplay = item.latency_ms != null ? `${item.latency_ms}ms` : '—';
  const destinationDisplay = item.destination_app ?? 'Unknown';

  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[IntentHistoryCard] pressed item:', item.id);
        onPress();
      }}
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IntentBadge type={item.intent_type} size="sm" />
        <Text
          style={{
            flex: 1,
            color: COLORS.text,
            fontSize: 14,
            fontFamily: 'SpaceGrotesk_500Medium',
          }}
          numberOfLines={1}
        >
          {destinationDisplay}
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontFamily: 'SpaceGrotesk_400Regular',
          }}
        >
          {relativeTime}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        <View
          style={{
            backgroundColor: `${resultColor}20`,
            borderRadius: 5,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: resultColor,
              fontSize: 10,
              fontWeight: '600',
              fontFamily: 'SpaceGrotesk_600SemiBold',
              textTransform: 'uppercase',
            }}
          >
            {item.result}
          </Text>
        </View>
        <Text
          style={{
            color: COLORS.textTertiary,
            fontSize: 11,
            fontFamily: 'SpaceGrotesk_400Regular',
            fontVariant: ['tabular-nums'],
          }}
        >
          {latencyDisplay}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
