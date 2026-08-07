import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Animated,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, INTENT_COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting, InstalledApp } from '@/contexts/RoutingContext';
import { supabase } from '@/utils/supabase';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { IntentBadge } from '@/components/IntentBadge';
import { Plus, X, LayoutGrid, CheckCircle2 } from 'lucide-react-native';
import { INTENT_META } from '@/utils/intent-parser';
import { APP_CATALOGUE } from '@/constants/AppCatalogue';

const CATALOGUE_INTENT_TYPES = Object.keys(APP_CATALOGUE);

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

export default function AppsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { apps, refreshApps, loading } = useRouting();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogueTab, setCatalogueTab] = useState(CATALOGUE_INTENT_TYPES[0] ?? 'email');
  const [addingPackage, setAddingPackage] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    console.log('[Apps] onRefresh');
    setRefreshing(true);
    await refreshApps();
    setRefreshing(false);
  }, [refreshApps]);

  const handleToggle = useCallback(
    async (app: InstalledApp, enabled: boolean) => {
      console.log('[Apps] toggle app:', app.id, enabled);
      if (!user) return;
      try {
        await supabase
          .from('installed_apps')
          .update({ is_enabled: enabled })
          .eq('id', app.id);
        await refreshApps();
      } catch (err) {
        console.error('[Apps] toggle error', err);
      }
    },
    [user, refreshApps]
  );

  const handleAddFromCatalogue = useCallback(
    async (entry: { display_name: string; package_name: string; icon: string }, intentType: string) => {
      console.log('[Apps] add from catalogue:', entry.display_name, entry.package_name, intentType);
      if (!user) return;
      const alreadyAdded = apps.some((a) => a.package_name === entry.package_name);
      if (alreadyAdded) return;
      setAddingPackage(entry.package_name);
      try {
        await supabase.from('installed_apps').insert({
          user_id: user.id,
          display_name: entry.display_name,
          package_name: entry.package_name,
          intent_type: intentType,
          is_enabled: true,
        });
        await refreshApps();
      } catch (err) {
        console.error('[Apps] add from catalogue error', err);
      } finally {
        setAddingPackage(null);
      }
    },
    [user, apps, refreshApps]
  );

  const handleDeleteApp = useCallback(
    (app: InstalledApp) => {
      console.log('[Apps] delete app long press:', app.id, app.display_name);
      Alert.alert(
        `Remove ${app.display_name}?`,
        'This app will be removed from your registered apps.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              console.log('[Apps] delete app confirmed:', app.id);
              try {
                await supabase.from('installed_apps').delete().eq('id', app.id);
                await refreshApps();
              } catch (err) {
                console.error('[Apps] delete app error', err);
              }
            },
          },
        ]
      );
    },
    [refreshApps]
  );

  // Group apps by intent type
  const INTENT_TYPES = Object.keys(INTENT_META);
  const grouped = INTENT_TYPES.reduce<Record<string, InstalledApp[]>>((acc, type) => {
    const typeApps = apps.filter((a) => a.intent_type === type);
    if (typeApps.length > 0) acc[type] = typeApps;
    return acc;
  }, {});

  const groupEntries = Object.entries(grouped);

  const catalogueEntries = APP_CATALOGUE[catalogueTab] ?? [];

  return (
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
            Registered Apps
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Apps] add app FAB pressed');
              setShowAddModal(true);
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
        ) : apps.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid size={32} color={COLORS.primary} />}
            title="No apps registered"
            subtitle="Add destination apps to route intents to the right place"
            ctaLabel="Add your first app"
            onCta={() => {
              console.log('[Apps] EmptyState CTA pressed');
              setShowAddModal(true);
            }}
          />
        ) : (
          groupEntries.map(([type, typeApps], groupIndex) => {
            const color = INTENT_COLORS[type] ?? COLORS.primary;
            return (
              <View key={type} style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
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
                {typeApps.map((app, appIndex) => (
                  <AnimatedListItem key={app.id} index={groupIndex * 3 + appIndex}>
                    <AppCard
                      app={app}
                      onToggle={(enabled) => handleToggle(app, enabled)}
                      onLongPress={() => handleDeleteApp(app)}
                    />
                  </AnimatedListItem>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add App Modal — Catalogue Picker */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          console.log('[Apps] add modal dismissed');
          setShowAddModal(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
          {/* Modal header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 18,
                fontWeight: '600',
                fontFamily: 'SpaceGrotesk_600SemiBold',
              }}
            >
              Add App
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Apps] close add modal');
                setShowAddModal(false);
              }}
            >
              <X size={22} color={COLORS.textSecondary} />
            </AnimatedPressable>
          </View>

          {/* Intent type tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
            style={{ flexGrow: 0 }}
          >
            {CATALOGUE_INTENT_TYPES.map((type) => {
              const isSelected = catalogueTab === type;
              const color = INTENT_COLORS[type] ?? COLORS.primary;
              const label = INTENT_META[type]?.label ?? type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    console.log('[Apps] catalogue tab selected:', type);
                    setCatalogueTab(type);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: isSelected ? `${color}20` : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isSelected ? color : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? color : COLORS.textSecondary,
                      fontSize: 13,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Catalogue entries */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {catalogueEntries.map((entry) => {
              const alreadyAdded = apps.some((a) => a.package_name === entry.package_name);
              const isAdding = addingPackage === entry.package_name;
              return (
                <TouchableOpacity
                  key={entry.package_name}
                  onPress={() => {
                    console.log('[Apps] catalogue entry tapped:', entry.display_name, entry.package_name);
                    handleAddFromCatalogue(entry, catalogueTab);
                  }}
                  disabled={alreadyAdded || isAdding}
                  activeOpacity={alreadyAdded ? 1 : 0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: alreadyAdded ? COLORS.surfaceSecondary : COLORS.surfaceElevated,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: alreadyAdded ? COLORS.border : COLORS.border,
                    opacity: alreadyAdded ? 0.55 : 1,
                  }}
                >
                  {/* Icon */}
                  <Text style={{ fontSize: 28 }}>{entry.icon}</Text>

                  {/* Name + package */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: alreadyAdded ? COLORS.textSecondary : COLORS.text,
                        fontSize: 14,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      {entry.display_name}
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
                      {entry.package_name}
                    </Text>
                  </View>

                  {/* Status indicator */}
                  {alreadyAdded ? (
                    <CheckCircle2 size={20} color={COLORS.accent} />
                  ) : isAdding ? (
                    <Text
                      style={{
                        color: COLORS.textTertiary,
                        fontSize: 12,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      }}
                    >
                      Adding…
                    </Text>
                  ) : (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: `${COLORS.primary}40`,
                      }}
                    >
                      <Plus size={16} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Done button */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={() => {
                console.log('[Apps] catalogue done pressed');
                setShowAddModal(false);
              }}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                  fontFamily: 'SpaceGrotesk_600SemiBold',
                }}
              >
                Done
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
