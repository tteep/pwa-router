import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, INTENT_COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { IntentBadge } from '@/components/IntentBadge';
import { LayoutGrid, Settings2, ExternalLink, Info, Globe } from 'lucide-react-native';
import { INTENT_TYPE_QUERY } from '@/constants/AndroidRoles';
import { queryDeviceAppsForType, requestBecomeDefault } from '@/utils/device-apps';
import { openDefaultAppsSettings, openAppDefaultSettings, DeviceApp } from '@/modules/android-defaults';

interface PwaApp {
  id: string;
  name: string;
  url: string;
  intent_types: string[];
  package_name: string;
  is_active: boolean;
}

const INTENT_TYPES = Object.keys(INTENT_TYPE_QUERY);

function isRoleBased(intentType: string): boolean {
  return !!INTENT_TYPE_QUERY[intentType]?.role;
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function AppsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grouped, setGrouped] = useState<Record<string, DeviceApp[]>>({});
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [requestingType, setRequestingType] = useState<string | null>(null);
  const [pwaApps, setPwaApps] = useState<PwaApp[]>([]);
  const [pwaLoading, setPwaLoading] = useState(true);

  const loadDeviceApps = useCallback(async () => {
    console.log('[Apps] loadDeviceApps start');
    const results: Record<string, DeviceApp[]> = {};
    await Promise.all(
      INTENT_TYPES.map(async (type) => {
        const apps = await queryDeviceAppsForType(type);
        if (apps.length > 0) results[type] = apps;
      })
    );
    console.log('[Apps] loadDeviceApps done, types found:', Object.keys(results));
    setGrouped(results);
    return results;
  }, []);

  const loadEnabledPrefs = useCallback(async (groupedApps: Record<string, DeviceApp[]>) => {
    if (!user) return;
    console.log('[Apps] loadEnabledPrefs for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('installed_apps')
        .select('package_name, intent_type, is_enabled')
        .eq('user_id', user.id);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      Object.entries(groupedApps).forEach(([type, apps]) => {
        apps.forEach((app) => {
          map[`${type}:${app.packageName}`] = true;
        });
      });
      (data ?? []).forEach((row: { package_name: string; intent_type: string; is_enabled: boolean }) => {
        map[`${row.intent_type}:${row.package_name}`] = row.is_enabled;
      });
      setEnabledMap(map);
    } catch (err) {
      console.error('[Apps] loadEnabledPrefs error', err);
    }
  }, [user]);

  const loadPwaApps = useCallback(async () => {
    if (!user) {
      setPwaLoading(false);
      return;
    }
    console.log('[Apps] loadPwaApps for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('pwa_apps')
        .select('id, name, url, intent_types, package_name, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('[Apps] loaded', data?.length ?? 0, 'pwa apps');
      setPwaApps(data ?? []);
    } catch (err) {
      console.error('[Apps] loadPwaApps error:', err);
    } finally {
      setPwaLoading(false);
    }
  }, [user]);

  const loadAll = useCallback(async () => {
    const groupedApps = await loadDeviceApps();
    await Promise.all([loadEnabledPrefs(groupedApps), loadPwaApps()]);
    setLoading(false);
  }, [loadDeviceApps, loadEnabledPrefs, loadPwaApps]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    console.log('[Apps] onRefresh');
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleToggle = useCallback(async (intentType: string, app: DeviceApp, enabled: boolean) => {
    const key = `${intentType}:${app.packageName}`;
    console.log('[Apps] toggle app:', key, enabled);
    if (!user) return;
    setTogglingKey(key);
    setEnabledMap((prev) => ({ ...prev, [key]: enabled }));
    try {
      const { data: existing } = await supabase
        .from('installed_apps')
        .select('id')
        .eq('user_id', user.id)
        .eq('package_name', app.packageName)
        .eq('intent_type', intentType)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('installed_apps')
          .update({ is_enabled: enabled })
          .eq('id', existing.id);
      } else {
        await supabase.from('installed_apps').insert({
          user_id: user.id,
          display_name: app.label,
          package_name: app.packageName,
          intent_type: intentType,
          is_enabled: enabled,
        });
      }
      console.log('[Apps] toggle saved:', key, enabled);
    } catch (err) {
      console.error('[Apps] toggle error', err);
      setEnabledMap((prev) => ({ ...prev, [key]: !enabled }));
    } finally {
      setTogglingKey(null);
    }
  }, [user]);

  const handleSetDefault = useCallback(async (intentType: string) => {
    console.log('[Apps] Set as Default pressed for type:', intentType);
    setRequestingType(intentType);
    try {
      const result = await requestBecomeDefault(intentType);
      console.log('[Apps] requestBecomeDefault result:', intentType, result);
    } catch (err) {
      console.error('[Apps] requestBecomeDefault error', err);
    } finally {
      setRequestingType(null);
    }
  }, []);

  const handleOpenDefaultSettings = useCallback(async () => {
    console.log('[Apps] Open Default Apps Settings pressed');
    try {
      await openDefaultAppsSettings();
    } catch (err) {
      console.error('[Apps] openDefaultAppsSettings error', err);
    }
  }, []);

  const handleOpenAppSettings = useCallback(async (packageName: string) => {
    console.log('[Apps] Open App Default Settings pressed:', packageName);
    try {
      await openAppDefaultSettings(packageName);
    } catch (err) {
      console.error('[Apps] openAppDefaultSettings error', err);
    }
  }, []);

  const groupEntries = Object.entries(grouped);
  const totalApps = groupEntries.reduce((sum, [, apps]) => sum + apps.length, 0);

  if (Platform.OS !== 'android') {
    return (
      <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top + 16 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 26,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.4,
            }}
          >
            Device Apps
          </Text>
        </View>
        <EmptyState
          icon={<LayoutGrid size={32} color={COLORS.textSecondary} />}
          title="Android only"
          subtitle="Default app management requires an Android device with PackageManager access"
        />
      </View>
      </ErrorBoundary>
    );
  }

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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
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
            Device Apps
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[Apps] Manage PWAs pressed');
                router.push('/(tabs)/(apps)/pwa');
              }}
              style={{
                height: 36,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: `${COLORS.primary}18`,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: `${COLORS.primary}35`,
                flexDirection: 'row',
                gap: 6,
              }}
            >
              <Globe size={14} color={COLORS.primary} />
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 12,
                  fontFamily: 'SpaceGrotesk_500Medium',
                }}
              >
                Manage PWAs
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleOpenDefaultSettings}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Settings2 size={18} color={COLORS.textSecondary} />
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
        {/* Info banner */}
        <View
          style={{
            backgroundColor: `${COLORS.primary}12`,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: `${COLORS.primary}30`,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <LayoutGrid size={14} color={COLORS.primary} />
          <Text
            style={{
              flex: 1,
              color: COLORS.primary,
              fontSize: 12,
              fontFamily: 'SpaceGrotesk_400Regular',
              lineHeight: 17,
            }}
          >
            Apps shown are installed on this device and can handle each intent type
          </Text>
        </View>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : totalApps === 0 ? (
          <EmptyState
            icon={<LayoutGrid size={32} color={COLORS.primary} />}
            title="No apps found"
            subtitle="No installed apps were found that can handle the supported intent types"
          />
        ) : (
          groupEntries.map(([type, typeApps], groupIndex) => {
            const color = INTENT_COLORS[type] ?? COLORS.primary;
            const isRequesting = requestingType === type;
            const roleBased = isRoleBased(type);

            return (
              <View key={type} style={{ marginBottom: 24 }}>
                {/* Section header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 3,
                        height: 16,
                        borderRadius: 2,
                        backgroundColor: color,
                      }}
                    />
                    <IntentBadge type={type} />
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 12,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      }}
                    >
                      {typeApps.length}
                      {' '}
                      app
                      {typeApps.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {roleBased && (
                    <AnimatedPressable
                      onPress={() => handleSetDefault(type)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 7,
                        backgroundColor: isRequesting ? `${color}30` : `${color}18`,
                        borderWidth: 1,
                        borderColor: `${color}40`,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <ExternalLink size={11} color={color} />
                      <Text
                        style={{
                          color: color,
                          fontSize: 11,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {isRequesting ? 'Requesting…' : 'Set Default'}
                      </Text>
                    </AnimatedPressable>
                  )}
                </View>

                {/* Non-role banner */}
                {!roleBased && (
                  <View
                    style={{
                      backgroundColor: `${COLORS.warning}10`,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: `${COLORS.warning}25`,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Info size={13} color={COLORS.warning} />
                    <Text
                      style={{
                        flex: 1,
                        color: COLORS.warning,
                        fontSize: 11,
                        fontFamily: 'SpaceGrotesk_400Regular',
                        lineHeight: 16,
                      }}
                    >
                      Tap an app to manage its default link handling in Android Settings
                    </Text>
                  </View>
                )}

                {/* App rows */}
                {typeApps.map((app, appIndex) => {
                  const key = `${type}:${app.packageName}`;
                  const isEnabled = enabledMap[key] ?? true;
                  const isToggling = togglingKey === key;

                  const rowContent = (
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        marginBottom: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      {/* Default dot */}
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: app.isDefault ? COLORS.accent : COLORS.surfaceElevated,
                          borderWidth: app.isDefault ? 0 : 1,
                          borderColor: COLORS.border,
                        }}
                      />
                      {/* Labels */}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            color: COLORS.text,
                            fontSize: 14,
                            fontFamily: 'SpaceGrotesk_500Medium',
                          }}
                        >
                          {app.label}
                        </Text>
                        <Text
                          style={{
                            color: COLORS.textTertiary,
                            fontSize: 11,
                            fontFamily: 'SpaceGrotesk_400Regular',
                            letterSpacing: 0.1,
                          }}
                          numberOfLines={1}
                        >
                          {app.packageName}
                        </Text>
                      </View>
                      {/* Default badge */}
                      {app.isDefault && (
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 5,
                            backgroundColor: `${COLORS.accent}20`,
                          }}
                        >
                          <Text
                            style={{
                              color: COLORS.accent,
                              fontSize: 10,
                              fontFamily: 'SpaceGrotesk_600SemiBold',
                            }}
                          >
                            DEFAULT
                          </Text>
                        </View>
                      )}
                      {/* Non-role: settings icon; role-based: toggle switch */}
                      {roleBased ? (
                        <Switch
                          value={isEnabled}
                          onValueChange={(val) => {
                            console.log('[Apps] switch toggled:', key, val);
                            handleToggle(type, app, val);
                          }}
                          disabled={isToggling}
                          trackColor={{ false: COLORS.surfaceElevated, true: `${color}80` }}
                          thumbColor={isEnabled ? color : COLORS.textTertiary}
                          ios_backgroundColor={COLORS.surfaceElevated}
                        />
                      ) : (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: COLORS.surfaceSecondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: COLORS.border,
                          }}
                        >
                          <Settings2 size={14} color={COLORS.textSecondary} />
                        </View>
                      )}
                    </View>
                  );

                  return (
                    <AnimatedListItem key={key} index={groupIndex * 4 + appIndex}>
                      {roleBased ? (
                        rowContent
                      ) : (
                        <AnimatedPressable
                          onPress={() => handleOpenAppSettings(app.packageName)}
                        >
                          {rowContent}
                        </AnimatedPressable>
                      )}
                    </AnimatedListItem>
                  );
                })}
              </View>
            );
          })
        )}

        {/* ── PWA Apps section ── */}
        <View style={{ marginTop: totalApps > 0 || loading ? 8 : 0 }}>
          {/* Section header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 3,
                  height: 16,
                  borderRadius: 2,
                  backgroundColor: COLORS.primary,
                }}
              />
              <Globe size={14} color={COLORS.primary} />
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 13,
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                }}
              >
                PWA Apps
              </Text>
              {!pwaLoading && (
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 12,
                    fontFamily: 'SpaceGrotesk_400Regular',
                  }}
                >
                  {pwaApps.length}
                  {' '}
                  app
                  {pwaApps.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <AnimatedPressable
              onPress={() => {
                console.log('[Apps] PWA section manage pressed');
                router.push('/(tabs)/(apps)/pwa');
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 7,
                backgroundColor: `${COLORS.primary}18`,
                borderWidth: 1,
                borderColor: `${COLORS.primary}40`,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ExternalLink size={11} color={COLORS.primary} />
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 11,
                  fontFamily: 'SpaceGrotesk_500Medium',
                }}
              >
                Manage
              </Text>
            </AnimatedPressable>
          </View>

          {pwaLoading ? (
            <SkeletonCard />
          ) : pwaApps.length === 0 ? (
            <AnimatedPressable
              onPress={() => {
                console.log('[Apps] PWA empty state add pressed');
                router.push('/(tabs)/(apps)/pwa');
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderStyle: 'dashed',
                  paddingHorizontal: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Globe size={20} color={COLORS.textTertiary} />
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    textAlign: 'center',
                  }}
                >
                  No PWA apps yet. Tap to add a PWA routing target.
                </Text>
              </View>
            </AnimatedPressable>
          ) : (
            pwaApps.map((app, idx) => (
              <AnimatedListItem key={app.id} index={idx}>
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 6,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: COLORS.primary,
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: COLORS.text,
                          fontSize: 14,
                          fontFamily: 'SpaceGrotesk_500Medium',
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
                        backgroundColor: `${COLORS.primary}20`,
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.primary,
                          fontSize: 10,
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                        }}
                      >
                        PWA
                      </Text>
                    </View>
                  </View>
                  {app.intent_types.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingLeft: 18 }}>
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
      </ScrollView>
    </View>
    </ErrorBoundary>
  );
}
