import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { IntentBadge } from '@/components/IntentBadge';
import {
  Globe,
  Zap,
  Plus,
  ChevronRight,
  Wifi,
  Camera,
  FolderOpen,
  Share2,
  User,
  MapPin,
  Mail,
  Phone,
  Map,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PwaApp {
  id: string;
  name: string;
  url: string;
  intent_types: string[];
  package_name: string;
  is_active: boolean;
}

interface RoutingRuleRow {
  intent_type: string;
  dest_pwa_url: string | null;
  dest_pwa_name: string | null;
  priority: number;
}

interface DestinationConfig {
  intentType: string;
  label: string;
  icon: React.ReactNode;
  pwaName: string | null;
  pwaUrl: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DESTINATION_INTENT_TYPES: Array<{ type: string; label: string; icon: React.ReactNode }> = [
  { type: 'email',   label: 'Email',   icon: <Mail   size={16} color={COLORS.primary} /> },
  { type: 'browser', label: 'Browser', icon: <Globe  size={16} color={COLORS.primary} /> },
  { type: 'tel',     label: 'Phone',   icon: <Phone  size={16} color={COLORS.primary} /> },
  { type: 'geo',     label: 'Maps',    icon: <Map    size={16} color={COLORS.primary} /> },
  { type: 'text',    label: 'Share',   icon: <Share2 size={16} color={COLORS.primary} /> },
];

const NATIVE_CAPABILITIES = [
  { label: 'Camera',   icon: <Camera    size={15} color={COLORS.textSecondary} /> },
  { label: 'Files',    icon: <FolderOpen size={15} color={COLORS.textSecondary} /> },
  { label: 'Share',    icon: <Share2    size={15} color={COLORS.textSecondary} /> },
  { label: 'Contacts', icon: <User      size={15} color={COLORS.textSecondary} /> },
  { label: 'Location', icon: <MapPin    size={15} color={COLORS.textSecondary} /> },
];

// ─── Animated list item ───────────────────────────────────────────────────────

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 45, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 45, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontFamily: 'SpaceGrotesk_600SemiBold',
          letterSpacing: 0.9,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {action && onAction && (
        <AnimatedPressable
          onPress={onAction}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 7,
            backgroundColor: `${COLORS.primary}15`,
            borderWidth: 1,
            borderColor: `${COLORS.primary}35`,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontSize: 11,
              fontFamily: 'SpaceGrotesk_500Medium',
            }}
          >
            {action}
          </Text>
          <ChevronRight size={11} color={COLORS.primary} />
        </AnimatedPressable>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DestinationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pwaApps, setPwaApps] = useState<PwaApp[]>([]);
  const [destinations, setDestinations] = useState<DestinationConfig[]>([]);

  const loadData = useCallback(async () => {
    if (!user) {
      console.log('[Destinations] no user, skipping load');
      setLoading(false);
      return;
    }
    console.log('[Destinations] loadData for user:', user.id);

    try {
      const [pwaRes, rulesRes] = await Promise.all([
        supabase
          .from('pwa_apps')
          .select('id, name, url, intent_types, package_name, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('routing_rules')
          .select('intent_type, dest_pwa_url, dest_pwa_name, priority')
          .eq('user_id', user.id)
          .eq('is_enabled', true)
          .not('dest_pwa_url', 'is', null)
          .order('priority', { ascending: false }),
      ]);

      if (pwaRes.error) throw pwaRes.error;
      if (rulesRes.error) throw rulesRes.error;

      const apps: PwaApp[] = pwaRes.data ?? [];
      const rules: RoutingRuleRow[] = rulesRes.data ?? [];

      console.log('[Destinations] loaded', apps.length, 'pwa apps,', rules.length, 'rules');

      // For each intent type, find the highest-priority rule with dest_pwa_url
      const configs: DestinationConfig[] = DESTINATION_INTENT_TYPES.map(({ type, label, icon }) => {
        const rule = rules.find((r) => r.intent_type === type);
        if (rule && rule.dest_pwa_url) {
          return {
            intentType: type,
            label,
            icon,
            pwaName: rule.dest_pwa_name ?? rule.dest_pwa_url,
            pwaUrl: rule.dest_pwa_url,
          };
        }
        // Fallback: check pwaApps for a matching active app
        const fallbackApp = apps.find((a) => a.intent_types.includes(type));
        if (fallbackApp) {
          return {
            intentType: type,
            label,
            icon,
            pwaName: fallbackApp.name,
            pwaUrl: fallbackApp.url,
          };
        }
        return { intentType: type, label, icon, pwaName: null, pwaUrl: null };
      });

      setPwaApps(apps);
      setDestinations(configs);
    } catch (err) {
      console.error('[Destinations] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    console.log('[Destinations] onRefresh');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddPwa = useCallback(() => {
    console.log('[Destinations] Add PWA button pressed');
    router.push('/(tabs)/(apps)/pwa');
  }, [router]);

  const handleManagePwa = useCallback(() => {
    console.log('[Destinations] Manage PWAs pressed');
    router.push('/(tabs)/(apps)/pwa');
  }, [router]);

  const handleConfigureDestination = useCallback((intentType: string) => {
    console.log('[Destinations] Configure destination pressed:', intentType);
    router.push('/(tabs)/(apps)/pwa');
  }, [router]);

  const handleTestIntent = useCallback(() => {
    console.log('[Destinations] Test Intent button pressed');
    router.push('/test-intent');
  }, [router]);

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 26,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk_700Bold',
                letterSpacing: -0.4,
              }}
            >
              Destinations
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AnimatedPressable
                onPress={handleTestIntent}
                style={{
                  height: 36,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: `${COLORS.accent}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: `${COLORS.accent}35`,
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Zap size={14} color={COLORS.accent} />
                <Text
                  style={{
                    color: COLORS.accent,
                    fontSize: 12,
                    fontFamily: 'SpaceGrotesk_500Medium',
                  }}
                >
                  Test
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleAddPwa}
                style={{
                  height: 36,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Plus size={14} color="#fff" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  Add PWA
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
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
          {/* ── DESTINATIONS section ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionHeader title="Destinations" />

            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              destinations.map((dest, idx) => {
                const isConfigured = dest.pwaName !== null;
                const dotColor = isConfigured ? COLORS.accent : COLORS.textTertiary;

                return (
                  <AnimatedListItem key={dest.intentType} index={idx}>
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        marginBottom: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      {/* Intent icon */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          backgroundColor: `${COLORS.primary}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: `${COLORS.primary}25`,
                        }}
                      >
                        {dest.icon}
                      </View>

                      {/* Labels */}
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={{
                            color: COLORS.text,
                            fontSize: 14,
                            fontFamily: 'SpaceGrotesk_600SemiBold',
                          }}
                        >
                          {dest.label}
                        </Text>
                        {isConfigured && dest.pwaUrl ? (
                          <Text
                            style={{
                              color: COLORS.textTertiary,
                              fontSize: 11,
                              fontFamily: 'SpaceGrotesk_400Regular',
                            }}
                            numberOfLines={1}
                          >
                            {dest.pwaUrl}
                          </Text>
                        ) : null}
                      </View>

                      {/* Status + configure */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ alignItems: 'flex-end', gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: 4,
                                backgroundColor: dotColor,
                              }}
                            />
                            <Text
                              style={{
                                color: isConfigured ? COLORS.text : COLORS.textTertiary,
                                fontSize: 13,
                                fontFamily: 'SpaceGrotesk_500Medium',
                              }}
                            >
                              {isConfigured ? dest.pwaName : 'Not configured'}
                            </Text>
                          </View>
                        </View>
                        <AnimatedPressable
                          onPress={() => handleConfigureDestination(dest.intentType)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 7,
                            backgroundColor: `${COLORS.primary}15`,
                            borderWidth: 1,
                            borderColor: `${COLORS.primary}35`,
                          }}
                        >
                          <Text
                            style={{
                              color: COLORS.primary,
                              fontSize: 11,
                              fontFamily: 'SpaceGrotesk_500Medium',
                            }}
                          >
                            Configure
                          </Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  </AnimatedListItem>
                );
              })
            )}
          </View>

          {/* ── TRUSTED PWAs section ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionHeader title="Trusted PWAs" action="Manage" onAction={handleManagePwa} />

            {loading ? (
              <SkeletonCard />
            ) : pwaApps.length === 0 ? (
              <AnimatedPressable
                onPress={handleAddPwa}
              >
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderStyle: 'dashed',
                    paddingHorizontal: 14,
                    paddingVertical: 18,
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Globe size={22} color={COLORS.textTertiary} />
                  <Text
                    style={{
                      color: COLORS.textTertiary,
                      fontSize: 13,
                      fontFamily: 'SpaceGrotesk_400Regular',
                      textAlign: 'center',
                    }}
                  >
                    No PWA apps yet. Tap to add a routing destination.
                  </Text>
                </View>
              </AnimatedPressable>
            ) : (
              pwaApps.map((app, idx) => (
                <AnimatedListItem key={app.id} index={idx}>
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 8,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          backgroundColor: `${COLORS.primary}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: `${COLORS.primary}25`,
                        }}
                      >
                        <Globe size={16} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            color: COLORS.text,
                            fontSize: 14,
                            fontFamily: 'SpaceGrotesk_600SemiBold',
                          }}
                          numberOfLines={1}
                        >
                          {app.name}
                        </Text>
                        <Text
                          style={{
                            color: COLORS.textTertiary,
                            fontSize: 11,
                            fontFamily: 'SpaceGrotesk_400Regular',
                          }}
                          numberOfLines={1}
                        >
                          {app.url}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 5,
                          backgroundColor: `${COLORS.accent}18`,
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.accent,
                            fontSize: 10,
                            fontFamily: 'SpaceGrotesk_600SemiBold',
                          }}
                        >
                          ACTIVE
                        </Text>
                      </View>
                    </View>
                    {app.intent_types.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingLeft: 44 }}>
                        {app.intent_types.map((type) => (
                          <IntentBadge key={type} type={type} />
                        ))}
                      </View>
                    )}
                  </View>
                </AnimatedListItem>
              ))
            )}
          </View>

          {/* ── NATIVE CAPABILITIES section ── */}
          <View style={{ marginBottom: 28 }}>
            <SectionHeader title="Native Capabilities" />
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                overflow: 'hidden',
              }}
            >
              {NATIVE_CAPABILITIES.map((cap, idx) => {
                const isLast = idx === NATIVE_CAPABILITIES.length - 1;
                return (
                  <View
                    key={cap.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: COLORS.border,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: COLORS.surfaceSecondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      {cap.icon}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color: COLORS.text,
                        fontSize: 14,
                        fontFamily: 'SpaceGrotesk_500Medium',
                      }}
                    >
                      {cap.label}
                    </Text>
                    <Text
                      style={{
                        color: COLORS.textTertiary,
                        fontSize: 11,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      }}
                    >
                      Via bridge
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 5,
                        backgroundColor: `${COLORS.accent}15`,
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.accent,
                          fontSize: 10,
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                        }}
                      >
                        AVAILABLE
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Info banner ── */}
          <View
            style={{
              backgroundColor: `${COLORS.primary}10`,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${COLORS.primary}28`,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Wifi size={15} color={COLORS.primary} />
            <Text
              style={{
                flex: 1,
                color: COLORS.primary,
                fontSize: 12,
                fontFamily: 'SpaceGrotesk_400Regular',
                lineHeight: 18,
              }}
            >
              Android intents → Gatsby Router → your configured Gatsby PWA
            </Text>
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}
