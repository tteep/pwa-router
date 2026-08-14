import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  Circle,
  Smartphone,
  Trash2,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PwaApp {
  id: string;
  name: string;
  url: string;
  package_name: string;
  intent_types: string[];
  is_active: boolean;
}

interface CurrentRule {
  dest_pwa_name: string | null;
  dest_pwa_url: string | null;
}

// ─── Intent label map ─────────────────────────────────────────────────────────

const INTENT_LABELS: Record<string, string> = {
  email: 'Email',
  browser: 'Browser',
  tel: 'Phone',
  geo: 'Maps',
  text: 'Share',
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConfigureScreen() {
  const { intentType } = useLocalSearchParams<{ intentType: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwaApps, setPwaApps] = useState<PwaApp[]>([]);
  const [currentRule, setCurrentRule] = useState<CurrentRule | null>(null);
  const [destType, setDestType] = useState<'pwa' | 'native'>('pwa');
  const [selectedPwaId, setSelectedPwaId] = useState<string | null>(null);

  const intentLabel = INTENT_LABELS[intentType ?? ''] ?? (intentType ?? 'Unknown');
  const screenTitle = `${intentLabel} Destination`;

  const loadData = useCallback(async () => {
    if (!user || !intentType) {
      console.log('[Configure] no user or intentType, skipping load');
      setLoading(false);
      return;
    }
    console.log('[Configure] loadData for intentType:', intentType, 'user:', user.id);

    try {
      const [appsRes, ruleRes] = await Promise.all([
        supabase
          .from('pwa_apps')
          .select('id, name, url, package_name, intent_types, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('routing_rules')
          .select('dest_pwa_url, dest_pwa_name')
          .eq('user_id', user.id)
          .eq('intent_type', intentType)
          .eq('is_enabled', true)
          .not('dest_pwa_url', 'is', null)
          .order('priority', { ascending: false })
          .limit(1),
      ]);

      if (appsRes.error) throw appsRes.error;
      if (ruleRes.error) throw ruleRes.error;

      const apps: PwaApp[] = appsRes.data ?? [];
      const rules = ruleRes.data ?? [];

      console.log('[Configure] loaded', apps.length, 'pwa apps, rule:', rules[0] ?? null);

      setPwaApps(apps);

      if (rules.length > 0 && rules[0].dest_pwa_url) {
        setCurrentRule({ dest_pwa_name: rules[0].dest_pwa_name, dest_pwa_url: rules[0].dest_pwa_url });
        // Pre-select the matching PWA
        const match = apps.find((a) => a.url === rules[0].dest_pwa_url);
        if (match) setSelectedPwaId(match.id);
      } else {
        setCurrentRule(null);
      }
    } catch (err) {
      console.error('[Configure] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, intentType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!user || !intentType) return;
    const pwa = pwaApps.find((a) => a.id === selectedPwaId);
    if (!pwa) {
      Alert.alert('Select a PWA', 'Please select a PWA destination before saving.');
      return;
    }
    console.log('[Configure] save pressed — intentType:', intentType, 'pwa:', pwa.name, pwa.url);
    setSaving(true);
    try {
      const { error } = await supabase.from('routing_rules').upsert(
        {
          user_id: user.id,
          name: `${pwa.name} \u2192 ${intentType}`,
          intent_type: intentType,
          dest_pwa_url: pwa.url,
          dest_pwa_name: pwa.name,
          dest_package: pwa.package_name,
          dest_display_name: pwa.name,
          priority: 100,
          is_enabled: true,
          condition_field: null,
          condition_operator: null,
          condition_value: null,
        },
        { onConflict: 'user_id,intent_type,dest_package' }
      );
      if (error) throw error;
      console.log('[Configure] save success');
      Alert.alert('Saved', `${pwa.name} is now the destination for ${intentLabel} intents.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[Configure] save error:', err);
      Alert.alert('Save failed', 'Could not save the destination. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, intentType, intentLabel, pwaApps, selectedPwaId, router]);

  const handleClear = useCallback(() => {
    if (!user || !intentType) return;
    console.log('[Configure] clear destination pressed — intentType:', intentType);
    Alert.alert(
      'Clear destination?',
      `This will remove all routing rules for ${intentLabel} intents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            console.log('[Configure] clear confirmed — intentType:', intentType);
            try {
              const { error } = await supabase
                .from('routing_rules')
                .delete()
                .eq('user_id', user.id)
                .eq('intent_type', intentType);
              if (error) throw error;
              console.log('[Configure] clear success');
              router.back();
            } catch (err) {
              console.error('[Configure] clear error:', err);
              Alert.alert('Error', 'Could not clear the destination. Please try again.');
            }
          },
        },
      ]
    );
  }, [user, intentType, intentLabel, router]);

  const handleAddPwa = useCallback(() => {
    console.log('[Configure] add PWA pressed');
    router.push('/(tabs)/(apps)/pwa');
  }, [router]);

  const isConfigured = currentRule !== null;
  const currentName = currentRule?.dest_pwa_name ?? currentRule?.dest_pwa_url ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <AnimatedPressable
          onPress={() => {
            console.log('[Configure] back pressed');
            router.back();
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color={COLORS.text} />
        </AnimatedPressable>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 18,
            fontFamily: 'SpaceGrotesk_700Bold',
            letterSpacing: -0.3,
            flex: 1,
          }}
        >
          {screenTitle}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 40,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current destination card */}
        <View>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontFamily: 'SpaceGrotesk_600SemiBold',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Current Destination
          </Text>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isConfigured ? `${COLORS.accent}40` : COLORS.border,
              paddingHorizontal: 14,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: isConfigured ? `${COLORS.accent}18` : COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isConfigured ? `${COLORS.accent}30` : COLORS.border,
              }}
            >
              <Globe size={16} color={isConfigured ? COLORS.accent : COLORS.textTertiary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  color: isConfigured ? COLORS.text : COLORS.textTertiary,
                  fontSize: 14,
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                }}
              >
                {isConfigured ? currentName : 'Not configured'}
              </Text>
              {isConfigured && currentRule?.dest_pwa_url ? (
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 11,
                    fontFamily: 'SpaceGrotesk_400Regular',
                  }}
                  numberOfLines={1}
                >
                  {currentRule.dest_pwa_url}
                </Text>
              ) : null}
            </View>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isConfigured ? COLORS.accent : COLORS.textTertiary,
              }}
            />
          </View>
        </View>

        {/* Destination Type */}
        <View>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontFamily: 'SpaceGrotesk_600SemiBold',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Destination Type
          </Text>
          <View style={{ gap: 8 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[Configure] destination type selected: pwa');
                setDestType('pwa');
              }}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: destType === 'pwa' ? COLORS.primary : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 13,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: destType === 'pwa' ? `${COLORS.primary}18` : COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: destType === 'pwa' ? `${COLORS.primary}30` : COLORS.border,
                }}
              >
                <Globe size={16} color={destType === 'pwa' ? COLORS.primary : COLORS.textTertiary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 14,
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  Gatsby PWA
                </Text>
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 11,
                    fontFamily: 'SpaceGrotesk_400Regular',
                  }}
                >
                  Route to a configured Gatsby PWA
                </Text>
              </View>
              {destType === 'pwa' ? (
                <CheckCircle2 size={18} color={COLORS.primary} />
              ) : (
                <Circle size={18} color={COLORS.textTertiary} />
              )}
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                console.log('[Configure] destination type selected: native');
                setDestType('native');
              }}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: destType === 'native' ? COLORS.primary : COLORS.border,
                paddingHorizontal: 14,
                paddingVertical: 13,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: destType === 'native' ? `${COLORS.primary}18` : COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: destType === 'native' ? `${COLORS.primary}30` : COLORS.border,
                }}
              >
                <Smartphone size={16} color={destType === 'native' ? COLORS.primary : COLORS.textTertiary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 14,
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  Native fallback
                </Text>
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 11,
                    fontFamily: 'SpaceGrotesk_400Regular',
                  }}
                >
                  Use the system default app
                </Text>
              </View>
              {destType === 'native' ? (
                <CheckCircle2 size={18} color={COLORS.primary} />
              ) : (
                <Circle size={18} color={COLORS.textTertiary} />
              )}
            </AnimatedPressable>
          </View>
        </View>

        {/* Select PWA — only shown when destType === 'pwa' */}
        {destType === 'pwa' && (
          <View>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk_600SemiBold',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Select PWA
            </Text>

            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : pwaApps.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderStyle: 'dashed',
                  paddingHorizontal: 14,
                  paddingVertical: 20,
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Globe size={24} color={COLORS.textTertiary} />
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    textAlign: 'center',
                  }}
                >
                  No active PWAs found. Add one first.
                </Text>
                <AnimatedPressable
                  onPress={handleAddPwa}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: `${COLORS.primary}18`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary}35`,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 13,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    Add a PWA
                  </Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {pwaApps.map((pwa) => {
                  const isSelected = selectedPwaId === pwa.id;
                  return (
                    <AnimatedPressable
                      key={pwa.id}
                      onPress={() => {
                        console.log('[Configure] PWA selected:', pwa.name, pwa.url);
                        setSelectedPwaId(pwa.id);
                      }}
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          backgroundColor: isSelected ? `${COLORS.primary}18` : COLORS.surfaceSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: isSelected ? `${COLORS.primary}30` : COLORS.border,
                        }}
                      >
                        <Globe size={16} color={isSelected ? COLORS.primary : COLORS.textTertiary} />
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
                          {pwa.name}
                        </Text>
                        <Text
                          style={{
                            color: COLORS.textTertiary,
                            fontSize: 11,
                            fontFamily: 'SpaceGrotesk_400Regular',
                          }}
                          numberOfLines={1}
                        >
                          {pwa.url}
                        </Text>
                      </View>
                      {isSelected ? (
                        <CheckCircle2 size={18} color={COLORS.primary} />
                      ) : (
                        <Circle size={18} color={COLORS.textTertiary} />
                      )}
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Save button */}
        <AnimatedPressable
          onPress={handleSave}
          disabled={saving || (destType === 'pwa' && !selectedPwaId)}
          style={{
            backgroundColor:
              saving || (destType === 'pwa' && !selectedPwaId)
                ? `${COLORS.primary}50`
                : COLORS.primary,
            borderRadius: 12,
            paddingVertical: 15,
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 15,
              fontFamily: 'SpaceGrotesk_600SemiBold',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </AnimatedPressable>

        {/* Clear destination */}
        {isConfigured && (
          <AnimatedPressable
            onPress={handleClear}
            style={{
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: `${COLORS.danger}40`,
              backgroundColor: `${COLORS.danger}10`,
            }}
          >
            <Trash2 size={15} color={COLORS.danger} />
            <Text
              style={{
                color: COLORS.danger,
                fontSize: 14,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              Clear destination
            </Text>
          </AnimatedPressable>
        )}
      </ScrollView>
    </View>
  );
}
