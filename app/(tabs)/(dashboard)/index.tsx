import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
  ChevronRight,
  Wifi,
  Mail,
  Globe,
  MapPin,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  rulesCount: number;
  appsCount: number;
  todayIntentsCount: number;
  avgLatencyMs: number;
}

interface BridgeStatusRow {
  intentType: string;
  label: string;
  icon: React.ReactNode;
  pwaName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { rules, refreshRules } = useRouting();

  const [history, setHistory] = useState<IntentHistoryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    rulesCount: 0,
    appsCount: 0,
    todayIntentsCount: 0,
    avgLatencyMs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatusRow[]>([]);

  const fetchData = useCallback(async () => {
    console.log('[Dashboard] fetchData', { userId: user?.id });
    if (!user) {
      setLoading(false);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    try {
      const [rulesRes, appsRes, historyRes, todayRes, bridgeRes] = await Promise.all([
        supabase
          .from('routing_rules')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('pwa_apps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('intent_history')
          .select('id, intent_type, dest_display_name, result, latency_ms, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('intent_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', todayIso),
        supabase
          .from('routing_rules')
          .select('intent_type, dest_pwa_url, dest_pwa_name, priority')
          .eq('user_id', user.id)
          .eq('is_enabled', true)
          .not('dest_pwa_url', 'is', null)
          .in('intent_type', ['email', 'browser', 'geo'])
          .order('priority', { ascending: false }),
      ]);

      const rulesCount = rulesRes.count ?? 0;
      const appsCount = appsRes.count ?? 0;
      const todayIntentsCount = todayRes.count ?? 0;

      const historyRows = (historyRes.data ?? []) as Array<{
        id: string;
        intent_type: string;
        dest_display_name: string | null;
        result: string;
        latency_ms: number | null;
        created_at: string;
      }>;

      const mappedHistory: IntentHistoryItem[] = historyRows.map((row) => ({
        id: row.id,
        intent_type: row.intent_type,
        destination_app: row.dest_display_name,
        result: row.result,
        latency_ms: row.latency_ms,
        created_at: row.created_at,
      }));

      const avgLatencyMs =
        historyRows.length > 0
          ? Math.round(
              historyRows.reduce((sum, h) => sum + (h.latency_ms ?? 0), 0) / historyRows.length
            )
          : 0;

      setHistory(mappedHistory);
      setStats({ rulesCount, appsCount, todayIntentsCount, avgLatencyMs });

      // Build bridge status rows
      const bridgeRules = (bridgeRes.data ?? []) as Array<{
        intent_type: string;
        dest_pwa_url: string | null;
        dest_pwa_name: string | null;
        priority: number;
      }>;

      const bridgeIntents: Array<{ type: string; label: string; icon: React.ReactNode }> = [
        { type: 'email',   label: 'Email',   icon: <Mail    size={13} color={COLORS.textSecondary} /> },
        { type: 'browser', label: 'Web',     icon: <Globe   size={13} color={COLORS.textSecondary} /> },
        { type: 'geo',     label: 'Maps',    icon: <MapPin  size={13} color={COLORS.textSecondary} /> },
      ];

      const statusRows: BridgeStatusRow[] = bridgeIntents.map(({ type, label, icon }) => {
        const rule = bridgeRules.find((r) => r.intent_type === type);
        return {
          intentType: type,
          label,
          icon,
          pwaName: rule?.dest_pwa_name ?? null,
        };
      });

      setBridgeStatus(statusRows);
      console.log('[Dashboard] fetchData done', { rulesCount, appsCount, todayIntentsCount, avgLatencyMs });
    } catch (err) {
      console.error('[Dashboard] fetchData error', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    console.log('[Dashboard] onRefresh');
    setRefreshing(true);
    await Promise.all([fetchData(), refreshRules()]);
    setRefreshing(false);
  }, [fetchData, refreshRules]);

  const activeRules = rules.filter((r) => r.is_enabled).length;
  const topRules = rules.filter((r) => r.is_enabled).slice(0, 3);

  const avgLatencyDisplay = `${stats.avgLatencyMs}ms`;
  const rulesCountDisplay = String(stats.rulesCount);
  const appsCountDisplay = String(stats.appsCount);
  const todayIntentsDisplay = String(stats.todayIntentsCount);
  const activeRulesDisplay = String(activeRules);

  return (
    <ErrorBoundary>
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
              PWA Bridge
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
                value={todayIntentsDisplay}
                label="Today's Intents"
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
                value={appsCountDisplay}
                label="PWAs Registered"
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

        {/* Bridge Status Card */}
        <>
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
            Bridge Status
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Dashboard] Bridge Status card pressed, navigating to destinations');
              router.push('/(tabs)/(apps)');
            }}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Wifi size={16} color={COLORS.primary} />
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 14,
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  Bridge Status
                </Text>
              </View>
              <ChevronRight size={14} color={COLORS.textTertiary} />
            </View>
            <View style={{ gap: 10 }}>
              {bridgeStatus.map((row) => {
                const isConfigured = row.pwaName !== null;
                const dotColor = isConfigured ? COLORS.accent : COLORS.textTertiary;
                const valueText = isConfigured ? row.pwaName : 'Not configured';
                const valueColor = isConfigured ? COLORS.text : COLORS.textTertiary;
                return (
                  <View
                    key={row.intentType}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: dotColor,
                      }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      {row.icon}
                      <Text
                        style={{
                          color: COLORS.text,
                          fontSize: 13,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        }}
                      >
                        {row.label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: valueColor,
                        fontSize: 12,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      }}
                      numberOfLines={1}
                    >
                      {valueText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </AnimatedPressable>
        </>

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
    </ErrorBoundary>
  );
}
