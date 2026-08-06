import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/contexts/RoutingContext';
import { supabase } from '@/utils/supabase';
import { StatCard } from '@/components/StatCard';
import { IntentHistoryCard, IntentHistoryItem } from '@/components/IntentHistoryCard';
import { RuleCard } from '@/components/RuleCard';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard, SkeletonStatCard } from '@/components/SkeletonLoader';
import {
  Activity,
  Zap,
  LayoutGrid,
  Clock,
  FlaskConical,
  History,
} from 'lucide-react-native';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
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
  },
  {
    id: 'h2',
    intent_type: 'geo',
    destination_app: 'Google Maps',
    result: 'routed',
    latency_ms: 18,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'h3',
    intent_type: 'browser',
    destination_app: 'Chrome',
    result: 'routed',
    latency_ms: 31,
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'h4',
    intent_type: 'pdf',
    destination_app: null,
    result: 'error',
    latency_ms: 120,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { rules, refreshRules } = useRouting();

  const [history, setHistory] = useState<IntentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    console.log('[Dashboard] fetchHistory', { userId: user?.id });
    if (!user) {
      setHistory(DEMO_HISTORY);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('intent_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setHistory((data ?? []) as IntentHistoryItem[]);
    } catch (err) {
      console.warn('[Dashboard] fetchHistory error', err);
      setHistory(DEMO_HISTORY);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    console.log('[Dashboard] onRefresh');
    setRefreshing(true);
    await Promise.all([fetchHistory(), refreshRules()]);
    setRefreshing(false);
  }, [fetchHistory, refreshRules]);

  const totalRouted = history.filter((h) => h.result === 'routed').length;
  const activeRules = rules.filter((r) => r.is_active).length;
  const avgLatency =
    history.length > 0
      ? Math.round(
          history.reduce((sum, h) => sum + (h.latency_ms ?? 0), 0) / history.length
        )
      : 0;
  const topRules = rules.filter((r) => r.is_active).slice(0, 3);

  const avgLatencyDisplay = `${avgLatency}ms`;
  const totalRoutedDisplay = String(totalRouted);
  const activeRulesDisplay = String(activeRules);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        paddingBottom: 120,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <View>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              fontFamily: 'SpaceGrotesk_500Medium',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            Universal Router
          </Text>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 28,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            Gatsby Router
          </Text>
        </View>
        <AnimatedPressable
          onPress={() => {
            console.log('[Dashboard] Test Intent button pressed');
            router.push('/test-intent');
          }}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FlaskConical size={16} color="#fff" />
          <Text
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: '600',
              fontFamily: 'SpaceGrotesk_600SemiBold',
            }}
          >
            Test Intent
          </Text>
        </AnimatedPressable>
      </View>

      {/* Stats Grid */}
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 12,
          fontFamily: 'SpaceGrotesk_600SemiBold',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Overview
      </Text>
      {loading ? (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <SkeletonStatCard />
          <SkeletonStatCard />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard
              icon={<Activity size={18} color={COLORS.accent} />}
              value={totalRoutedDisplay}
              label="Total Routed"
              color={COLORS.accent}
            />
            <StatCard
              icon={<Zap size={18} color={COLORS.primary} />}
              value={activeRulesDisplay}
              label="Rules Active"
              color={COLORS.primary}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <StatCard
              icon={<LayoutGrid size={18} color="#BC8CFF" />}
              value={String(history.length)}
              label="Apps Registered"
              color="#BC8CFF"
            />
            <StatCard
              icon={<Clock size={18} color={COLORS.warning} />}
              value={avgLatencyDisplay}
              label="Avg Latency"
              color={COLORS.warning}
            />
          </View>
        </>
      )}

      {/* Recent Intents */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 12,
            fontFamily: 'SpaceGrotesk_600SemiBold',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          Recent Intents
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[Dashboard] View all history pressed');
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontSize: 12,
              fontFamily: 'SpaceGrotesk_500Medium',
            }}
          >
            View all
          </Text>
        </AnimatedPressable>
      </View>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : history.length === 0 ? (
        <EmptyState
          icon={<History size={32} color={COLORS.primary} />}
          title="No intents yet"
          subtitle="Simulate an intent to see routing history here"
          ctaLabel="Simulate intent"
          onCta={() => {
            console.log('[Dashboard] EmptyState CTA pressed');
            router.push('/test-intent');
          }}
        />
      ) : (
        history.map((item, index) => (
          <AnimatedListItem key={item.id} index={index}>
            <IntentHistoryCard
              item={item}
              onPress={() => {
                console.log('[Dashboard] history item pressed:', item.id);
                router.push(`/intent/${item.id}`);
              }}
            />
          </AnimatedListItem>
        ))
      )}

      {/* Quick Rules */}
      {topRules.length > 0 && (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 12,
                fontFamily: 'SpaceGrotesk_600SemiBold',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              Active Rules
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Dashboard] View all rules pressed');
                router.push('/(tabs)/(rules)');
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 12,
                  fontFamily: 'SpaceGrotesk_500Medium',
                }}
              >
                View all
              </Text>
            </AnimatedPressable>
          </View>
          {topRules.map((rule, index) => (
            <AnimatedListItem key={rule.id} index={index}>
              <RuleCard
                rule={rule}
                onPress={() => {
                  console.log('[Dashboard] quick rule pressed:', rule.id);
                  router.push(`/rule/${rule.id}`);
                }}
                onToggle={() => {}}
              />
            </AnimatedListItem>
          ))}
        </>
      )}
    </ScrollView>
  );
}
