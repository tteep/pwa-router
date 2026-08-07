import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  RefreshControl,
  LayoutAnimation,
} from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/contexts/RoutingContext';
import { supabase } from '@/utils/supabase';
import { RuleCard } from '@/components/RuleCard';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { RoutingRule } from '@/utils/routing-engine';
import { Plus, Zap } from 'lucide-react-native';

const FILTER_TABS = ['All', 'Email', 'Phone', 'Maps', 'PDF', 'Other'];
const FILTER_MAP: Record<string, string> = {
  Email: 'email',
  Phone: 'tel',
  Maps: 'geo',
  PDF: 'pdf',
};

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { rules, refreshRules, loading } = useRouting();
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Reload rules when returning from the editor
  useFocusEffect(
    useCallback(() => {
      console.log('[Rules] screen focused, refreshing rules');
      refreshRules();
    }, [refreshRules])
  );

  const onRefresh = useCallback(async () => {
    console.log('[Rules] onRefresh');
    setRefreshing(true);
    await refreshRules();
    setRefreshing(false);
  }, [refreshRules]);

  const handleToggle = useCallback(
    async (rule: RoutingRule, active: boolean) => {
      console.log('[Rules] toggle rule:', rule.id, active);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (!user) return;
      try {
        await supabase
          .from('routing_rules')
          .update({ is_enabled: active })
          .eq('id', rule.id);
        await refreshRules();
      } catch (err) {
        console.error('[Rules] toggle error', err);
      }
    },
    [user, refreshRules]
  );

  const filteredRules = rules.filter((r) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Other') {
      return !['email', 'tel', 'geo', 'pdf'].includes(r.intent_type);
    }
    return r.intent_type === FILTER_MAP[activeFilter];
  });

  return (
    <ErrorBoundary>
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: COLORS.background,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: COLORS.text,
              fontSize: 26,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.4,
            }}
          >
            Routing Rules
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Rules] create new rule pressed');
              router.push('/rule/new');
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} color="#fff" />
          </AnimatedPressable>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <AnimatedPressable
                key={tab}
                onPress={() => {
                  console.log('[Rules] filter tab pressed:', tab);
                  setActiveFilter(tab);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive ? COLORS.primary : COLORS.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.primary : COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#fff' : COLORS.textSecondary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_500Medium',
                  }}
                >
                  {tab}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
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
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredRules.length === 0 ? (
          <EmptyState
            icon={<Zap size={32} color={COLORS.primary} />}
            title="No routing rules yet"
            subtitle="Create rules to automatically route intents to the right app"
            ctaLabel="Create your first rule"
            onCta={() => {
              console.log('[Rules] EmptyState CTA pressed');
              router.push('/rule/new');
            }}
          />
        ) : (
          filteredRules.map((rule, index) => (
            <AnimatedListItem key={rule.id} index={index}>
              <RuleCard
                rule={rule}
                onPress={() => {
                  console.log('[Rules] rule card pressed:', rule.id);
                  router.push(`/rule/${rule.id}`);
                }}
                onToggle={(active) => handleToggle(rule, active)}
              />
            </AnimatedListItem>
          ))
        )}
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}
