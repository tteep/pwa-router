import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, INTENT_COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ArrowLeft, MoreHorizontal, ShieldAlert } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  is_banned: boolean;
}

interface RoutingRule {
  id: string;
  user_id: string;
  name: string;
  intent_type: string;
  is_active: boolean;
  created_at: string;
}

interface AppSetting {
  key: string;
  value: unknown;
  updated_at: string | null;
  updated_by: string | null;
}

type AdminTab = 'users' | 'rules' | 'settings';

const ADMIN_URL = 'https://eomrynglzkjeygguvtyw.supabase.co/functions/v1/admin-users';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: COLORS.textSecondary,
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 20,
        paddingHorizontal: 4,
      }}
    >
      {title}
    </Text>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: `${color}20`,
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: `${color}40`,
      }}
    >
      <Text
        style={{
          color,
          fontSize: 10,
          fontFamily: 'SpaceGrotesk_600SemiBold',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ── Admin check ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAdmin() {
      console.log('[Admin] checking admin status for user:', user?.id);
      if (!user) {
        setChecking(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        const adminStatus = data?.is_admin === true;
        console.log('[Admin] is_admin:', adminStatus);
        setIsAdmin(adminStatus);
      } catch (err) {
        console.error('[Admin] admin check error:', err);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    }
    checkAdmin();
  }, [user]);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    console.log('[Admin] loading admin data');
    setLoadingData(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token ?? '';

      const [usersRes, rulesRes, settingsRes] = await Promise.all([
        fetch(`${ADMIN_URL}?action=list`, {
          headers: { Authorization: `Bearer ${jwt}` },
        }),
        supabase
          .from('routing_rules')
          .select('id, user_id, name, intent_type, is_active, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*'),
      ]);

      // Users
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        console.log('[Admin] users loaded:', usersJson?.length ?? 0);
        setUsers(Array.isArray(usersJson) ? usersJson : []);
      } else {
        const text = await usersRes.text();
        console.error('[Admin] users fetch error:', usersRes.status, text);
      }

      // Rules
      if (rulesRes.error) {
        console.error('[Admin] rules fetch error:', rulesRes.error.message);
      } else {
        console.log('[Admin] rules loaded:', rulesRes.data?.length ?? 0);
        setRules(rulesRes.data ?? []);
      }

      // Settings
      if (settingsRes.error) {
        console.error('[Admin] settings fetch error:', settingsRes.error.message);
      } else {
        console.log('[Admin] settings loaded:', settingsRes.data?.length ?? 0);
        setSettings(settingsRes.data ?? []);
      }
    } catch (err) {
      console.error('[Admin] load data error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, loadData]);

  // ── User actions ───────────────────────────────────────────────────────────

  const handleUserMenu = useCallback(
    (targetUser: AdminUser) => {
      console.log('[Admin] user menu pressed for:', targetUser.id);
      const banLabel = targetUser.is_banned ? 'Unban' : 'Ban';
      const adminLabel = targetUser.is_admin ? 'Remove Admin' : 'Make Admin';

      Alert.alert(targetUser.email, 'Choose an action', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: banLabel,
          onPress: async () => {
            console.log('[Admin] ban/unban pressed for:', targetUser.id, 'action:', targetUser.is_banned ? 'unban' : 'ban');
            const action = targetUser.is_banned ? 'unban' : 'ban';
            const { data: sessionData } = await supabase.auth.getSession();
            const jwt = sessionData.session?.access_token ?? '';
            const res = await fetch(`${ADMIN_URL}?action=${action}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
              },
              body: JSON.stringify({ userId: targetUser.id }),
            });
            if (!res.ok) {
              const text = await res.text();
              console.error('[Admin] ban/unban error:', res.status, text);
              Alert.alert('Error', `Failed to ${action} user.`);
            } else {
              console.log('[Admin] ban/unban success');
              loadData();
            }
          },
        },
        {
          text: adminLabel,
          onPress: async () => {
            console.log('[Admin] toggle admin pressed for:', targetUser.id, 'current isAdmin:', targetUser.is_admin);
            const { data: sessionData } = await supabase.auth.getSession();
            const jwt = sessionData.session?.access_token ?? '';
            const res = await fetch(`${ADMIN_URL}?action=toggle-admin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
              },
              body: JSON.stringify({ userId: targetUser.id, isAdmin: !targetUser.is_admin }),
            });
            if (!res.ok) {
              const text = await res.text();
              console.error('[Admin] toggle admin error:', res.status, text);
              Alert.alert('Error', 'Failed to toggle admin status.');
            } else {
              console.log('[Admin] toggle admin success');
              loadData();
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete user?',
              `This will permanently delete ${targetUser.email}. This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    console.log('[Admin] delete user confirmed for:', targetUser.id);
                    const { data: sessionData } = await supabase.auth.getSession();
                    const jwt = sessionData.session?.access_token ?? '';
                    const res = await fetch(`${ADMIN_URL}?action=delete`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${jwt}`,
                      },
                      body: JSON.stringify({ userId: targetUser.id }),
                    });
                    if (!res.ok) {
                      const text = await res.text();
                      console.error('[Admin] delete user error:', res.status, text);
                      Alert.alert('Error', 'Failed to delete user.');
                    } else {
                      console.log('[Admin] delete user success');
                      loadData();
                    }
                  },
                },
              ]
            );
          },
        },
      ]);
    },
    [loadData]
  );

  // ── Settings update ────────────────────────────────────────────────────────

  const handleSettingChange = useCallback(
    async (key: string, newValue: unknown) => {
      console.log('[Admin] setting change:', key, '->', newValue);
      if (!user) return;
      const { error } = await supabase
        .from('app_settings')
        .update({
          value: newValue,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('key', key);
      if (error) {
        console.error('[Admin] setting update error:', error.message);
        Alert.alert('Error', 'Failed to update setting.');
      } else {
        console.log('[Admin] setting updated successfully:', key);
        setSettings((prev) =>
          prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
        );
      }
    },
    [user]
  );

  // ── Render guards ──────────────────────────────────────────────────────────

  if (checking) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.background,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 16,
          }}
        >
          <ShieldAlert size={48} color={COLORS.danger} />
          <Text
            style={{
              color: COLORS.text,
              fontSize: 22,
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.4,
            }}
          >
            Access Denied
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
              fontFamily: 'SpaceGrotesk_400Regular',
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            You do not have permission to view this page.
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Admin] back pressed from access denied');
              router.back();
            }}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              Go Back
            </Text>
          </AnimatedPressable>
        </View>
      </>
    );
  }

  // ── Tab content ────────────────────────────────────────────────────────────

  const booleanSettingKeys = [
    'maintenance_mode',
    'allow_new_signups',
    'feature_pwa_routing',
    'feature_intent_history',
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[Admin] back pressed');
                router.back();
              }}
            >
              <ArrowLeft size={22} color={COLORS.textSecondary} />
            </AnimatedPressable>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 20,
                fontFamily: 'SpaceGrotesk_700Bold',
                letterSpacing: -0.4,
                flex: 1,
              }}
            >
              Admin Panel
            </Text>
            {loadingData && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>

          {/* Segmented control */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 10,
              padding: 4,
            }}
          >
            {(['users', 'rules', 'settings'] as AdminTab[]).map((tab) => {
              const isActive = activeTab === tab;
              const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
              return (
                <AnimatedPressable
                  key={tab}
                  onPress={() => {
                    console.log('[Admin] tab switched to:', tab);
                    setActiveTab(tab);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: isActive ? COLORS.surface : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.text : COLORS.textSecondary,
                      fontSize: 13,
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                    }}
                  >
                    {tabLabel}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Users tab ── */}
          {activeTab === 'users' && (
            <>
              <SectionHeader title={`Users (${users.length})`} />
              {users.length === 0 && !loadingData && (
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    textAlign: 'center',
                    marginTop: 32,
                  }}
                >
                  No users found.
                </Text>
              )}
              {users.map((u) => {
                const relTime = getRelativeTime(u.created_at);
                const emailDisplay = truncate(u.email, 28);
                return (
                  <View
                    key={u.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 2,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={{
                          color: COLORS.text,
                          fontSize: 13,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {emailDisplay}
                      </Text>
                      <Text
                        style={{
                          color: COLORS.textTertiary,
                          fontSize: 11,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        }}
                      >
                        {relTime}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      {u.is_admin && <Badge label="ADMIN" color={COLORS.warning} />}
                      {u.is_banned && <Badge label="BANNED" color={COLORS.danger} />}
                    </View>
                    <AnimatedPressable
                      onPress={() => handleUserMenu(u)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: COLORS.surfaceSecondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MoreHorizontal size={16} color={COLORS.textSecondary} />
                    </AnimatedPressable>
                  </View>
                );
              })}
            </>
          )}

          {/* ── Rules tab ── */}
          {activeTab === 'rules' && (
            <>
              <SectionHeader title={`Routing Rules (${rules.length})`} />
              {rules.length === 0 && !loadingData && (
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    textAlign: 'center',
                    marginTop: 32,
                  }}
                >
                  No rules found.
                </Text>
              )}
              {rules.map((rule) => {
                const intentColor = INTENT_COLORS[rule.intent_type] ?? COLORS.textSecondary;
                const userIdShort = truncate(rule.user_id, 12);
                const activeLabel = rule.is_active ? 'Active' : 'Inactive';
                const activeColor = rule.is_active ? COLORS.accent : COLORS.textTertiary;
                return (
                  <View
                    key={rule.id}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 2,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{
                          flex: 1,
                          color: COLORS.text,
                          fontSize: 13,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {rule.name}
                      </Text>
                      <Badge label={rule.intent_type.toUpperCase()} color={intentColor} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{
                          color: COLORS.textTertiary,
                          fontSize: 11,
                          fontFamily: 'SpaceMono',
                        }}
                      >
                        {userIdShort}
                      </Text>
                      <Text
                        style={{
                          color: activeColor,
                          fontSize: 11,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {activeLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* ── Settings tab ── */}
          {activeTab === 'settings' && (
            <>
              <SectionHeader title="App Settings" />
              {settings.length === 0 && !loadingData && (
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    textAlign: 'center',
                    marginTop: 32,
                  }}
                >
                  No settings found.
                </Text>
              )}
              {settings.map((setting) => {
                const isBool = booleanSettingKeys.includes(setting.key);
                const isNumeric = setting.key === 'max_rules_per_user';
                const boolVal = setting.value === true || setting.value === 'true';
                const numVal = String(setting.value ?? '');

                return (
                  <View
                    key={setting.key}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      marginBottom: 2,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: COLORS.text,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_500Medium',
                      }}
                    >
                      {setting.key}
                    </Text>
                    {isBool && (
                      <Switch
                        value={boolVal}
                        onValueChange={(val) => {
                          console.log('[Admin] setting toggle:', setting.key, '->', val);
                          handleSettingChange(setting.key, val);
                        }}
                        trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.accent}80` }}
                        thumbColor={boolVal ? COLORS.accent : COLORS.textTertiary}
                        ios_backgroundColor={COLORS.surfaceElevated}
                      />
                    )}
                    {isNumeric && (
                      <TextInput
                        value={numVal}
                        onChangeText={(v) => {
                          const parsed = parseInt(v, 10);
                          if (!isNaN(parsed)) {
                            console.log('[Admin] numeric setting change:', setting.key, '->', parsed);
                            handleSettingChange(setting.key, parsed);
                          }
                        }}
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          color: COLORS.text,
                          fontSize: 13,
                          fontFamily: 'SpaceGrotesk_400Regular',
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          minWidth: 60,
                          textAlign: 'center',
                        }}
                      />
                    )}
                    {!isBool && !isNumeric && (
                      <Text
                        style={{
                          color: COLORS.textSecondary,
                          fontSize: 12,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        }}
                      >
                        {String(setting.value ?? '')}
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}
