import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { IntentBadge } from '@/components/IntentBadge';
import { IntentHistoryItem } from '@/components/IntentHistoryCard';

function getResultColor(result: string): string {
  if (result === 'routed') return COLORS.accent;
  if (result === 'error') return COLORS.danger;
  return COLORS.warning;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 4,
      }}
    >
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontFamily: 'SpaceGrotesk_500Medium',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: COLORS.text,
          fontSize: 14,
          fontFamily: mono ? 'SpaceMono' : 'SpaceGrotesk_400Regular',
          lineHeight: 20,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// Demo history for guest mode
const DEMO_HISTORY: IntentHistoryItem[] = [
  {
    id: 'h1',
    intent_type: 'email',
    destination_app: 'Outlook',
    result: 'routed',
    latency_ms: 42,
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    raw_data: { recipient: 'boss@company.com', subject: 'Q4 Report' },
    matched_rule_name: 'Work emails → Outlook',
  },
  {
    id: 'h2',
    intent_type: 'geo',
    destination_app: 'Google Maps',
    result: 'routed',
    latency_ms: 18,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    raw_data: { address: '1600 Amphitheatre Pkwy, Mountain View, CA' },
    matched_rule_name: 'Maps → Google Maps',
  },
  {
    id: 'h3',
    intent_type: 'browser',
    destination_app: 'Chrome',
    result: 'routed',
    latency_ms: 31,
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    raw_data: { url: 'https://github.com' },
    matched_rule_name: null,
  },
  {
    id: 'h4',
    intent_type: 'pdf',
    destination_app: null,
    result: 'error',
    latency_ms: 120,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    raw_data: { filename: 'report.pdf', file_size_mb: 12.4 },
    matched_rule_name: null,
  },
];

export default function IntentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<IntentHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[IntentDetail] loading intent:', id);
    async function load() {
      if (!user) {
        const demo = DEMO_HISTORY.find((h) => h.id === id) ?? null;
        setItem(demo);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('intent_history')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setItem(data as IntentHistoryItem);
      } catch (err) {
        console.error('[IntentDetail] load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' }}>
          Intent not found
        </Text>
      </View>
    );
  }

  const resultColor = getResultColor(item.result);
  const timestampDisplay = formatDate(item.created_at);
  const latencyDisplay = item.latency_ms != null ? `${item.latency_ms}ms` : '—';
  const rawDataDisplay = JSON.stringify(item.raw_data ?? {}, null, 2);
  const matchedRuleDisplay = item.matched_rule_name ?? 'No rule matched';
  const destinationDisplay = item.destination_app ?? 'Unknown';

  return (
    <>
      <Stack.Screen options={{ title: 'Intent Detail' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Type + Result header */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <IntentBadge type={item.intent_type} />
          <View
            style={{
              backgroundColor: `${resultColor}20`,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                color: resultColor,
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'SpaceGrotesk_600SemiBold',
                textTransform: 'uppercase',
              }}
            >
              {item.result}
            </Text>
          </View>
        </View>

        <DetailRow label="Timestamp" value={timestampDisplay} />
        <DetailRow label="Destination app" value={destinationDisplay} />
        <DetailRow label="Matched rule" value={matchedRuleDisplay} />
        <DetailRow label="Latency" value={latencyDisplay} />

        {/* Raw data */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 10,
            padding: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontFamily: 'SpaceGrotesk_500Medium',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Raw Data
          </Text>
          <View
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text
              selectable
              style={{
                color: COLORS.accent,
                fontSize: 12,
                fontFamily: 'SpaceMono',
                lineHeight: 18,
              }}
            >
              {rawDataDisplay}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
