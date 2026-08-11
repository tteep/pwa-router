import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { EmptyState } from '@/components/EmptyState';
import { IntentBadge } from '@/components/IntentBadge';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { Globe, Plus, X, ChevronLeft, Trash2, ExternalLink, Check } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PwaApp {
  id: string;
  user_id: string;
  name: string;
  url: string;
  icon_url: string | null;
  description: string | null;
  intent_types: string[];
  package_name: string;
  is_active: boolean;
  created_at: string;
}

const INTENT_TYPE_OPTIONS = ['browser', 'email', 'geo', 'pdf', 'image', 'text'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function generatePackageName(name: string): string {
  const slug = slugify(name);
  return slug ? `pwa.${slug}` : 'pwa.app';
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'url';
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 12,
          fontFamily: 'SpaceGrotesk_500Medium',
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: COLORS.text,
          fontSize: 15,
          fontFamily: 'SpaceGrotesk_400Regular',
          borderWidth: 1,
          borderColor: COLORS.border,
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

// ─── PWA Card ─────────────────────────────────────────────────────────────────

function PwaCard({
  app,
  defaultRules,
  onToggle,
  onDelete,
  onSetDefault,
}: {
  app: PwaApp;
  defaultRules: Record<string, boolean>; // intentType -> isDefault
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string, name: string) => void;
  onSetDefault: (app: PwaApp, intentType: string) => Promise<void>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDelete = useCallback(() => {
    console.log('[PWA] delete pressed:', app.id, app.name);
    onDelete(app.id, app.name);
  }, [app.id, app.name, onDelete]);

  const handleToggle = useCallback((val: boolean) => {
    console.log('[PWA] toggle active:', app.id, val);
    onToggle(app.id, val);
  }, [app.id, onToggle]);

  const handleSetDefault = useCallback(async (intentType: string) => {
    console.log('[PWA] Set as Default pressed:', app.name, intentType);
    setSettingDefault(intentType);
    try {
      await onSetDefault(app, intentType);
    } finally {
      setSettingDefault(null);
    }
  }, [app, onSetDefault]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 14,
          marginBottom: 10,
          gap: 10,
        }}
      >
        {/* Top row: icon + name + delete */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              backgroundColor: `${COLORS.primary}18`,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: `${COLORS.primary}30`,
            }}
          >
            <Globe size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
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
          <AnimatedPressable
            onPress={handleDelete}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: `${COLORS.danger}15`,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: `${COLORS.danger}30`,
            }}
          >
            <Trash2 size={14} color={COLORS.danger} />
          </AnimatedPressable>
        </View>

        {/* Intent type badges + Set as Default buttons */}
        {app.intent_types.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: COLORS.textTertiary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              Handles
            </Text>
            <View style={{ gap: 6 }}>
              {app.intent_types.map((type) => {
                const isDefault = defaultRules[type] ?? false;
                const isSetting = settingDefault === type;
                const btnBg = isDefault ? `${COLORS.accent}18` : `${COLORS.primary}12`;
                const btnBorder = isDefault ? `${COLORS.accent}40` : `${COLORS.primary}30`;
                const btnColor = isDefault ? COLORS.accent : COLORS.primary;
                const btnLabel = isDefault ? '✓ Default' : 'Set as Default';
                return (
                  <View
                    key={type}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <IntentBadge type={type} />
                    <AnimatedPressable
                      onPress={() => handleSetDefault(type)}
                      disabled={isSetting || isDefault}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 7,
                        backgroundColor: btnBg,
                        borderWidth: 1,
                        borderColor: btnBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {isSetting ? (
                        <ActivityIndicator size="small" color={btnColor} style={{ width: 12, height: 12 }} />
                      ) : isDefault ? (
                        <Check size={11} color={btnColor} />
                      ) : null}
                      <Text
                        style={{
                          color: btnColor,
                          fontSize: 11,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {isSetting ? 'Saving…' : btnLabel}
                      </Text>
                    </AnimatedPressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bottom row: package name + active toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: COLORS.textTertiary,
              fontSize: 10,
              fontFamily: 'SpaceGrotesk_400Regular',
              letterSpacing: 0.2,
            }}
          >
            {app.package_name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                color: app.is_active ? COLORS.accent : COLORS.textTertiary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              {app.is_active ? 'Active' : 'Inactive'}
            </Text>
            <Switch
              value={app.is_active}
              onValueChange={handleToggle}
              trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.accent}80` }}
              thumbColor={app.is_active ? COLORS.accent : COLORS.textTertiary}
              ios_backgroundColor={COLORS.surfaceElevated}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Add PWA Modal ────────────────────────────────────────────────────────────

function AddPwaModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    url: string;
    description: string;
    intent_types: string[];
    package_name: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const packageName = generatePackageName(name);

  const reset = useCallback(() => {
    setName('');
    setUrl('');
    setDescription('');
    setSelectedTypes([]);
    setError('');
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    console.log('[PWA] add modal closed');
    reset();
    onClose();
  }, [reset, onClose]);

  const toggleType = useCallback((type: string) => {
    console.log('[PWA] toggle intent type:', type);
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleSave = useCallback(async () => {
    console.log('[PWA] save pressed', { name, url, selectedTypes });
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
        intent_types: selectedTypes,
        package_name: packageName,
      });
      Alert.alert('PWA Added', 'Your PWA has been saved.');
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save PWA.';
      console.log('PWA save error:', err);
      console.error('[PWA] save error:', msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [name, url, description, selectedTypes, packageName, onSave, onClose, reset]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        {/* Modal header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.3,
            }}
          >
            Add PWA
          </Text>
          <AnimatedPressable
            onPress={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <X size={16} color={COLORS.textSecondary} />
          </AnimatedPressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field label="Name *" value={name} onChangeText={(v) => { setName(v); setError(''); }} placeholder="e.g. Gmail PWA" />
          <Field label="URL *" value={url} onChangeText={(v) => { setUrl(v); setError(''); }} placeholder="https://mail.google.com" keyboardType="url" />
          <Field label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Brief description of this PWA" multiline />

          {/* Package name preview */}
          {name.trim().length > 0 && (
            <View
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: COLORS.textTertiary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' }}>
                Package:
              </Text>
              <Text style={{ color: COLORS.primary, fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', flex: 1 }}>
                {packageName}
              </Text>
            </View>
          )}

          {/* Intent types */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' }}>
              Intent Types
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {INTENT_TYPE_OPTIONS.map((type) => {
                const selected = selectedTypes.includes(type);
                return (
                  <AnimatedPressable
                    key={type}
                    onPress={() => toggleType(type)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: selected ? `${COLORS.primary}20` : COLORS.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: selected ? `${COLORS.primary}60` : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? COLORS.primary : COLORS.textSecondary,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_500Medium',
                      }}
                    >
                      {type}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Error */}
          {error !== '' && (
            <View
              style={{
                backgroundColor: 'rgba(248,81,73,0.12)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(248,81,73,0.35)',
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: COLORS.danger, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Save button — error is shown above so it's always visible */}
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? COLORS.surfaceElevated : COLORS.primary,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            ) : (
              <>
                <Plus size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                  Add PWA
                </Text>
              </>
            )}
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PwaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [apps, setApps] = useState<PwaApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  // Map of "appId:intentType" -> true when a default rule exists
  const [defaultRulesMap, setDefaultRulesMap] = useState<Record<string, Record<string, boolean>>>({});

  const loadApps = useCallback(async () => {
    if (!user) {
      console.log('[PWA] no user, skipping load');
      setLoading(false);
      return;
    }
    console.log('[PWA] loading pwa_apps for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('pwa_apps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('[PWA] loaded', data?.length ?? 0, 'apps');
      setApps(data ?? []);
    } catch (err) {
      console.error('[PWA] loadApps error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadDefaultRules = useCallback(async (loadedApps: PwaApp[]) => {
    if (!user || loadedApps.length === 0) return;
    console.log('[PWA] loading default routing_rules for', loadedApps.length, 'apps');
    try {
      const packageNames = loadedApps.map((a) => a.package_name);
      const { data, error } = await supabase
        .from('routing_rules')
        .select('dest_package, intent_type')
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .in('dest_package', packageNames);
      if (error) throw error;
      const map: Record<string, Record<string, boolean>> = {};
      (data ?? []).forEach((row: { dest_package: string; intent_type: string }) => {
        const app = loadedApps.find((a) => a.package_name === row.dest_package);
        if (app) {
          if (!map[app.id]) map[app.id] = {};
          map[app.id][row.intent_type] = true;
        }
      });
      console.log('[PWA] default rules map loaded');
      setDefaultRulesMap(map);
    } catch (err) {
      console.error('[PWA] loadDefaultRules error:', err);
    }
  }, [user]);

  useEffect(() => {
    loadApps().then(() => {
      // loadDefaultRules is called after apps are set via state update
    });
  }, [loadApps]);

  // Load default rules whenever apps list changes
  useEffect(() => {
    if (apps.length > 0) {
      loadDefaultRules(apps);
    }
  }, [apps, loadDefaultRules]);

  const handleSetDefault = useCallback(async (app: PwaApp, intentType: string) => {
    if (!user) {
      console.log('[PWA] handleSetDefault: no user');
      return;
    }
    console.log('[PWA] handleSetDefault pressed:', app.name, intentType);
    try {
      // Upsert routing rule for this PWA + intent type
      const ruleName = `${app.name} → ${intentType}`;
      const { error } = await supabase
        .from('routing_rules')
        .upsert(
          {
            user_id: user.id,
            name: ruleName,
            intent_type: intentType,
            condition_field: null,
            condition_operator: null,
            condition_value: null,
            dest_package: app.package_name,
            dest_display_name: app.name,
            dest_pwa_url: app.url,
            dest_pwa_name: app.name,
            priority: 100,
            is_enabled: true,
          },
          {
            onConflict: 'user_id,intent_type,dest_package',
            ignoreDuplicates: false,
          }
        );
      if (error) {
        // If upsert fails due to missing unique constraint, try insert
        console.warn('[PWA] upsert failed, trying insert:', error.message);
        const { error: insertError } = await supabase.from('routing_rules').insert({
          user_id: user.id,
          name: ruleName,
          intent_type: intentType,
          condition_field: null,
          condition_operator: null,
          condition_value: null,
          dest_package: app.package_name,
          dest_display_name: app.name,
          dest_pwa_url: app.url,
          dest_pwa_name: app.name,
          priority: 100,
          is_enabled: true,
        });
        if (insertError) throw insertError;
      }
      console.log('[PWA] default rule saved for:', app.name, intentType);
      // Update local state
      setDefaultRulesMap((prev) => ({
        ...prev,
        [app.id]: { ...(prev[app.id] ?? {}), [intentType]: true },
      }));
      Alert.alert(
        'Default Set',
        `${app.name} is now your default for ${intentType} intents.`
      );
    } catch (err) {
      console.error('[PWA] handleSetDefault error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to set default.';
      Alert.alert('Error', msg);
    }
  }, [user]);

  const handleSave = useCallback(async (data: {
    name: string;
    url: string;
    description: string;
    intent_types: string[];
    package_name: string;
  }) => {
    if (!user) throw new Error('Not signed in');
    console.log('[PWA] inserting new pwa_app:', data.name, data.url);
    const { data: inserted, error } = await supabase
      .from('pwa_apps')
      .insert({
        user_id: user.id,
        name: data.name,
        url: data.url,
        description: data.description || null,
        intent_types: data.intent_types,
        package_name: data.package_name,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    console.log('[PWA] inserted pwa_app:', inserted.id);
    setApps((prev) => [inserted, ...prev]);
  }, [user]);

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    console.log('[PWA] toggling is_active:', id, active);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: active } : a)));
    try {
      const { error } = await supabase
        .from('pwa_apps')
        .update({ is_active: active })
        .eq('id', id);
      if (error) throw error;
      console.log('[PWA] toggle saved:', id, active);
    } catch (err) {
      console.error('[PWA] toggle error:', err);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !active } : a)));
    }
  }, []);

  const handleDelete = useCallback((id: string, name: string) => {
    console.log('[PWA] delete confirmation for:', id, name);
    Alert.alert(
      'Delete PWA',
      `Remove "${name}" from your routing targets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[PWA] confirmed delete:', id);
            setApps((prev) => prev.filter((a) => a.id !== id));
            try {
              const { error } = await supabase.from('pwa_apps').delete().eq('id', id);
              if (error) throw error;
              console.log('[PWA] deleted:', id);
            } catch (err) {
              console.error('[PWA] delete error:', err);
              loadApps();
            }
          },
        },
      ]
    );
  }, [loadApps]);

  const handleAddPress = useCallback(() => {
    console.log('[PWA] add button pressed');
    setShowAddModal(true);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[PWA] back pressed');
                  router.back();
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <ChevronLeft size={18} color={COLORS.textSecondary} />
              </AnimatedPressable>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 22,
                  fontWeight: '700',
                  fontFamily: 'SpaceGrotesk_700Bold',
                  letterSpacing: -0.4,
                }}
              >
                PWA Apps
              </Text>
            </View>
            <AnimatedPressable
              onPress={handleAddPress}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} color="#fff" />
            </AnimatedPressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
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
            <ExternalLink size={14} color={COLORS.primary} />
            <Text
              style={{
                flex: 1,
                color: COLORS.primary,
                fontSize: 12,
                fontFamily: 'SpaceGrotesk_400Regular',
                lineHeight: 17,
              }}
            >
              Register PWAs as routing targets alongside native apps
            </Text>
          </View>

          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : apps.length === 0 ? (
            <EmptyState
              icon={<Globe size={32} color={COLORS.primary} />}
              title="No PWA apps yet"
              subtitle="Add a PWA to use it as a routing target alongside your native apps"
            />
          ) : (
            apps.map((app) => (
              <PwaCard
                key={app.id}
                app={app}
                defaultRules={defaultRulesMap[app.id] ?? {}}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))
          )}
        </ScrollView>

        <AddPwaModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
        />
      </View>
    </>
  );
}
