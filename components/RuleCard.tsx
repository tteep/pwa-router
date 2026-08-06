import React from 'react';
import { View, Text, Switch } from 'react-native';
import { COLORS } from '@/constants/AppColors';
import { IntentBadge } from '@/components/IntentBadge';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RoutingRule } from '@/utils/routing-engine';
import { ChevronRight } from 'lucide-react-native';

interface RuleCardProps {
  rule: RoutingRule;
  onPress: () => void;
  onToggle: (active: boolean) => void;
  index?: number;
}

export function RuleCard({ rule, onPress, onToggle }: RuleCardProps) {
  const conditionSummary = rule.condition_field
    ? `${rule.condition_field} ${rule.condition_operator?.replace('_', ' ')} "${rule.condition_value}" → ${rule.destination_display_name}`
    : `Default → ${rule.destination_display_name}`;

  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[RuleCard] pressed rule:', rule.id, rule.name);
        onPress();
      }}
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
                fontWeight: '600',
                fontFamily: 'SpaceGrotesk_600SemiBold',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {rule.name}
            </Text>
            <View
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 10,
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                  fontVariant: ['tabular-nums'],
                }}
              >
                P{rule.priority}
              </Text>
            </View>
          </View>
          <IntentBadge type={rule.intent_type} size="sm" />
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              fontFamily: 'SpaceGrotesk_400Regular',
              lineHeight: 17,
            }}
            numberOfLines={2}
          >
            {conditionSummary}
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Switch
            value={rule.is_active}
            onValueChange={(val) => {
              console.log('[RuleCard] toggle rule:', rule.id, val);
              onToggle(val);
            }}
            trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.accent}80` }}
            thumbColor={rule.is_active ? COLORS.accent : COLORS.textTertiary}
            ios_backgroundColor={COLORS.surfaceElevated}
          />
          <ChevronRight size={16} color={COLORS.textTertiary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}
