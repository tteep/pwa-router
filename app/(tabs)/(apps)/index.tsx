import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
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
import { Plus, X, LayoutGrid } from 'lucide-react-native';
import { INTENT_META } from '@/utils/intent-parser';

const INTENT_TYPES = Object.keys(INTENT_META);

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
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPackageName, setNewPackageName] = useState('');
  const [newIntentType, setNewIntentType] = useState('email');
  const [saving, setSaving] = useState(false);

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

  const handleAddApp = useCallback(async () => {
    console.log('[Apps] add app pressed', { newDisplayName, newPackageName, newIntentType });
    if (!newDisplayName.trim() || !newPackageName.trim()) return;
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('installed_apps').insert({
        user_id: user.id,
        display_name: newDisplayName.trim(),
        package_name: newPackageName.trim(),
        intent_type: newIntentType,
        is_enabled: true,
      });
      await refreshApps();
      setShowAddModal(false);
      setNewDisplayName('');
      setNewPackageName('');
      setNewIntentType('email');
    } catch (err) {
      console.error('[Apps] add app error', err);
    } finally {
      setSaving(false);
    }
  }, [user, newDisplayName, newPackageName, newIntentType, refreshApps]);

  // Group apps by intent type
  const grouped = INTENT_TYPES.reduce<Record<string, InstalledApp[]>>((acc, type) => {
    const typeApps = apps.filter((a) => a.intent_type === type);
    if (typeApps.length > 0) acc[type] = typeApps;
    return acc;
  }, {});

  const groupEntries = Object.entries(grouped);

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
                    {typeApps.length} app{typeApps.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {typeApps.map((app, appIndex) => (
                  <AnimatedListItem key={app.id} index={groupIndex * 3 + appIndex}>
                    <AppCard
                      app={app}
                      onToggle={(enabled) => handleToggle(app, enabled)}
                    />
                  </AnimatedListItem>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add App Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          console.log('[Apps] add modal dismissed');
          setShowAddModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: COLORS.surface }}
        >
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

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Display Name</Text>
              <TextInput
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholder="e.g. Gmail"
                placeholderTextColor={COLORS.textTertiary}
                style={inputStyle}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Package Name</Text>
              <TextInput
                value={newPackageName}
                onChangeText={setNewPackageName}
                placeholder="e.g. com.google.android.gm"
                placeholderTextColor={COLORS.textTertiary}
                style={[inputStyle, { fontFamily: 'SpaceMono' }]}
                autoCapitalize="none"
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Intent Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {INTENT_TYPES.map((type) => {
                  const isSelected = newIntentType === type;
                  const color = INTENT_COLORS[type] ?? COLORS.primary;
                  return (
                    <AnimatedPressable
                      key={type}
                      onPress={() => {
                        console.log('[Apps] intent type selected:', type);
                        setNewIntentType(type);
                      }}
                      style={{
                        paddingHorizontal: 12,
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
                          fontSize: 12,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {INTENT_META[type]?.label ?? type}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>

            <AnimatedPressable
              onPress={handleAddApp}
              disabled={saving || !newDisplayName.trim() || !newPackageName.trim()}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 8,
                opacity: saving || !newDisplayName.trim() || !newPackageName.trim() ? 0.5 : 1,
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
                {saving ? 'Adding...' : 'Add App'}
              </Text>
            </AnimatedPressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const labelStyle = {
  color: COLORS.textSecondary,
  fontSize: 13,
  fontFamily: 'SpaceGrotesk_500Medium',
} as const;

const inputStyle = {
  backgroundColor: COLORS.surfaceSecondary,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: COLORS.text,
  fontSize: 14,
  fontFamily: 'SpaceGrotesk_400Regular',
  borderWidth: 1,
  borderColor: COLORS.border,
} as const;
