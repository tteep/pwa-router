import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/contexts/RoutingContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  getBiometricLock,
  setBiometricLock,
  getOfflineMode,
  setOfflineMode,
  clearCache,
  getLastSyncedAt,
} from '@/utils/storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ExpoSharing from 'expo-sharing';
import { supabase } from '@/utils/supabase';
import {
  User,
  RefreshCw,
  Fingerprint,
  Lock,
  WifiOff,
  Trash2,
  History,
  Download,
  Info,
  LogOut,
  ChevronRight,
  Shield,
  UserX,
  Smartphone,
  ExternalLink,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { ANDROID_ROLES, ANDROID_ROLE_LABELS } from '@/constants/AndroidRoles';
import { checkRole, openDefaultAppsSettings, requestDefaultRole } from '@/modules/android-defaults';
import { RoleStatus } from '@/modules/android-defaults';

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
        marginTop: 24,
        paddingHorizontal: 4,
      }}
    >
      {title}
    </Text>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

function SettingsRow({ icon, label, value, onPress, rightElement, destructive }: SettingsRowProps) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: destructive ? `${COLORS.danger}20` : COLORS.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          flex: 1,
          color: destructive ? COLORS.danger : COLORS.text,
          fontSize: 14,
          fontFamily: 'SpaceGrotesk_500Medium',
        }}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 13,
            fontFamily: 'SpaceGrotesk_400Regular',
          }}
        >
          {value}
        </Text>
      )}
      {rightElement}
      {onPress && !rightElement && (
        <ChevronRight size={16} color={COLORS.textTertiary} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress}>
        {content}
      </AnimatedPressable>
    );
  }
  return content;
}

function getRelativeSync(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const ROLE_ENTRIES = Object.entries(ANDROID_ROLES) as [string, string][];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { syncRules, lastSyncedAt } = useRouting();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [offlineMode, setOfflineModeState] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Role statuses: role string -> RoleStatus
  const [roleStatuses, setRoleStatuses] = useState<Record<string, RoleStatus>>({});
  const [requestingRole, setRequestingRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrefs() {
      const bio = await getBiometricLock();
      const offline = await getOfflineMode();
      const sync = await getLastSyncedAt();
      setBiometricEnabled(bio);
      setOfflineModeState(offline);
      setLastSync(sync);
    }
    loadPrefs();
  }, []);

  useEffect(() => {
    setLastSync(lastSyncedAt);
  }, [lastSyncedAt]);

  const loadRoleStatuses = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    console.log('[Settings] loadRoleStatuses');
    try {
      const results = await Promise.all(
        ROLE_ENTRIES.map(async ([, roleValue]) => {
          const status = await checkRole(roleValue);
          return [roleValue, status] as [string, RoleStatus];
        })
      );
      const map: Record<string, RoleStatus> = {};
      results.forEach(([role, status]) => {
        map[role] = status;
      });
      setRoleStatuses(map);
      console.log('[Settings] roleStatuses loaded', map);
    } catch (err) {
      console.error('[Settings] loadRoleStatuses error', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoleStatuses();
    }, [loadRoleStatuses])
  );

  const handleBiometricToggle = useCallback(async (val: boolean) => {
    console.log('[Settings] biometric toggle:', val);
    if (val) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric lock',
      });
      if (!result.success) return;
    }
    await setBiometricLock(val);
    setBiometricEnabled(val);
  }, []);

  const handleOfflineModeToggle = useCallback(async (val: boolean) => {
    console.log('[Settings] offline mode toggle:', val);
    await setOfflineMode(val);
    setOfflineModeState(val);
  }, []);

  const handleSyncNow = useCallback(async () => {
    console.log('[Settings] sync now pressed');
    setSyncing(true);
    try {
      await syncRules();
      const now = new Date().toISOString();
      setLastSync(now);
    } catch (err) {
      console.error('[Settings] sync error', err);
    } finally {
      setSyncing(false);
    }
  }, [syncRules]);

  const handleClearCache = useCallback(() => {
    console.log('[Settings] clear cache pressed');
    Alert.alert(
      'Clear cache?',
      'Cached rules and apps will be removed. They will be re-fetched on next sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear cache',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] clear cache confirmed');
            await clearCache();
            setLastSync(null);
          },
        },
      ]
    );
  }, []);

  const handleExportLogs = useCallback(async () => {
    console.log('[Settings] export logs pressed');
    if (!user) return;
    try {
      const { data } = await supabase
        .from('intent_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const json = JSON.stringify(data ?? [], null, 2);
      const isAvailable = await ExpoSharing.isAvailableAsync();
      if (isAvailable) {
        const FileSystem = await import('expo-file-system/legacy');
        const filePath = `${FileSystem.cacheDirectory}gatsby-logs.json`;
        await FileSystem.writeAsStringAsync(filePath, json);
        await ExpoSharing.shareAsync(filePath, { mimeType: 'application/json' });
      } else {
        Alert.alert('Export', 'Sharing is not available on this device.');
      }
    } catch (err) {
      console.error('[Settings] export logs error', err);
      Alert.alert('Export failed', 'Could not export logs. Please try again.');
    }
  }, [user]);

  const handleSignOut = useCallback(() => {
    console.log('[Settings] sign out pressed');
    Alert.alert('Sign out?', 'You will be signed out of your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          console.log('[Settings] sign out confirmed');
          await signOut();
        },
      },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    console.log('[Settings] delete account pressed');
    Alert.alert(
      'Delete account?',
      'This will permanently delete your account, all routing rules, intent history, and app data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] delete account confirmed');
            try {
              if (user) {
                await supabase.from('analytics_queue').delete().eq('user_id', user.id);
                await supabase.from('intent_history').delete().eq('user_id', user.id);
                await supabase.from('cached_responses').delete().eq('user_id', user.id);
                await supabase.from('routing_rules').delete().eq('user_id', user.id);
                await supabase.from('installed_apps').delete().eq('user_id', user.id);
                await supabase.from('profiles').delete().eq('id', user.id);
                await supabase.rpc('delete_user');
              }
              await signOut();
            } catch (err) {
              console.error('[Settings] delete account error', err);
              Alert.alert('Error', 'Could not delete account. Please contact support at support@gatsbyrouter.app.');
            }
          },
        },
      ]
    );
  }, [user, signOut]);

  const handlePrivacyPolicy = useCallback(() => {
    console.log('[Settings] privacy policy pressed');
    Linking.openURL('https://gatsbyrouter.app/privacy');
  }, []);

  const handleRequestRole = useCallback(async (role: string) => {
    console.log('[Settings] request role pressed:', role);
    setRequestingRole(role);
    try {
      const result = await requestDefaultRole(role);
      console.log('[Settings] requestDefaultRole result:', role, result);
      // Refresh statuses after request
      await loadRoleStatuses();
    } catch (err) {
      console.error('[Settings] requestDefaultRole error', err);
    } finally {
      setRequestingRole(null);
    }
  }, [loadRoleStatuses]);

  const handleOpenDefaultAppsSettings = useCallback(async () => {
    console.log('[Settings] open default apps settings pressed');
    try {
      await openDefaultAppsSettings();
    } catch (err) {
      console.error('[Settings] openDefaultAppsSettings error', err);
    }
  }, []);

  const syncLabel = getRelativeSync(lastSync);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const userEmail = user?.email ?? 'Guest';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 16,
        paddingBottom: 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          color: COLORS.text,
          fontSize: 26,
          fontWeight: '700',
          fontFamily: 'SpaceGrotesk_700Bold',
          letterSpacing: -0.4,
          marginBottom: 4,
        }}
      >
        Settings
      </Text>

      {/* Account */}
      <SectionHeader title="Account" />
      <SettingsRow
        icon={<User size={16} color={COLORS.primary} />}
        label={userEmail}
        value={user ? 'Signed in' : 'Guest'}
      />
      {user && (
        <SettingsRow
          icon={<LogOut size={16} color={COLORS.danger} />}
          label="Sign out"
          onPress={handleSignOut}
          destructive
        />
      )}
      {user && (
        <SettingsRow
          icon={<UserX size={16} color={COLORS.danger} />}
          label="Delete account"
          onPress={handleDeleteAccount}
          destructive
        />
      )}

      {/* Sync */}
      <SectionHeader title="Sync" />
      <SettingsRow
        icon={<RefreshCw size={16} color={COLORS.primary} />}
        label={syncing ? 'Syncing...' : 'Sync now'}
        value={`Last: ${syncLabel}`}
        onPress={handleSyncNow}
      />
      <SettingsRow
        icon={<RefreshCw size={16} color={COLORS.textSecondary} />}
        label="Sync interval"
        value="Every hour"
      />

      {/* Default App Roles — Android only */}
      {Platform.OS === 'android' && (
        <>
          <SectionHeader title="Default App Roles" />
          {ROLE_ENTRIES.map(([, roleValue]) => {
            const label = ANDROID_ROLE_LABELS[roleValue] ?? roleValue;
            const status = roleStatuses[roleValue];
            const isHeld = status?.isHeld ?? false;
            const isRequesting = requestingRole === roleValue;
            const statusText = isHeld ? 'Held by this app' : 'Not set';
            const statusColor = isHeld ? COLORS.accent : COLORS.textTertiary;
            return (
              <View
                key={roleValue}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.surface,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  marginBottom: 2,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Smartphone size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 14,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      color: statusColor,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_400Regular',
                    }}
                  >
                    {statusText}
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={() => handleRequestRole(roleValue)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    backgroundColor: isHeld ? `${COLORS.accent}18` : `${COLORS.primary}18`,
                    borderWidth: 1,
                    borderColor: isHeld ? `${COLORS.accent}40` : `${COLORS.primary}40`,
                  }}
                >
                  <Text
                    style={{
                      color: isHeld ? COLORS.accent : COLORS.primary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    {isRequesting ? 'Requesting…' : isHeld ? 'Held' : 'Request'}
                  </Text>
                </AnimatedPressable>
              </View>
            );
          })}
          <SettingsRow
            icon={<ExternalLink size={16} color={COLORS.textSecondary} />}
            label="Open Default Apps Settings"
            onPress={handleOpenDefaultAppsSettings}
          />
        </>
      )}

      {/* Security */}
      <SectionHeader title="Security" />
      <SettingsRow
        icon={<Fingerprint size={16} color={COLORS.primary} />}
        label="Biometric lock"
        rightElement={
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.accent}80` }}
            thumbColor={biometricEnabled ? COLORS.accent : COLORS.textTertiary}
            ios_backgroundColor={COLORS.surfaceElevated}
          />
        }
      />
      <SettingsRow
        icon={<Lock size={16} color={COLORS.textSecondary} />}
        label="Encrypted storage"
        value="Enabled"
      />

      {/* Routing */}
      <SectionHeader title="Routing" />
      <SettingsRow
        icon={<WifiOff size={16} color={COLORS.warning} />}
        label="Offline mode"
        rightElement={
          <Switch
            value={offlineMode}
            onValueChange={handleOfflineModeToggle}
            trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.warning}80` }}
            thumbColor={offlineMode ? COLORS.warning : COLORS.textTertiary}
            ios_backgroundColor={COLORS.surfaceElevated}
          />
        }
      />
      <SettingsRow
        icon={<Trash2 size={16} color={COLORS.danger} />}
        label="Clear cache"
        onPress={handleClearCache}
        destructive
      />

      {/* Logs */}
      <SectionHeader title="Logs" />
      <SettingsRow
        icon={<History size={16} color={COLORS.primary} />}
        label="View all logs"
        onPress={() => {
          console.log('[Settings] view all logs pressed');
          router.push('/(tabs)/(dashboard)');
        }}
      />
      <SettingsRow
        icon={<Download size={16} color={COLORS.primary} />}
        label="Export logs"
        onPress={handleExportLogs}
      />

      {/* About */}
      <SectionHeader title="About" />
      <SettingsRow
        icon={<Info size={16} color={COLORS.textSecondary} />}
        label="Gatsby Router"
        value={`v${appVersion}`}
      />
      <SettingsRow
        icon={<Shield size={16} color={COLORS.textSecondary} />}
        label="Privacy Policy"
        onPress={handlePrivacyPolicy}
      />
    </ScrollView>
  );
}
