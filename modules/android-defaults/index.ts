import { Linking, Platform, Alert } from 'react-native';

export interface DeviceApp {
  packageName: string;
  label: string;
  isDefault: boolean;
}

export interface RoleStatus {
  role: string;
  packageName: string;
  isDefault: boolean;
  /** @deprecated use isDefault */
  isHeld: boolean;
  /** @deprecated use packageName */
  currentDefault: string | null;
}

export async function getAppsForIntent(_action: string, _mimeType?: string, _scheme?: string): Promise<DeviceApp[]> {
  console.log('[AndroidDefaults] getAppsForIntent (stub)', { _action, _mimeType, _scheme });
  return [];
}

export async function getHandlersForScheme(_scheme: string): Promise<DeviceApp[]> {
  console.log('[AndroidDefaults] getHandlersForScheme (stub)', { _scheme });
  return [];
}

// Opens Android's Default Apps settings screen
export async function openDefaultAppsSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Try the most specific Default Apps settings URI first
  const uris = [
    'content://com.android.settings/default_apps',
    'android.settings.MANAGE_DEFAULT_APPS_SETTINGS',
  ];

  for (const uri of uris) {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        console.log('[AndroidDefaults] opening default apps settings via:', uri);
        await Linking.openURL(uri);
        return;
      }
    } catch (_) {}
  }

  // Final fallback: open general app settings and tell the user where to go
  console.log('[AndroidDefaults] falling back to Alert + openSettings()');
  Alert.alert(
    'Open Default Apps',
    'Go to Settings → Apps → Default Apps to change your default apps.',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
}

export async function requestDefaultRole(role: string, packageName?: string): Promise<boolean> {
  console.log('[AndroidDefaults] requestDefaultRole', { role, packageName, platform: Platform.OS });
  if (Platform.OS !== 'android') return false;
  await openDefaultAppsSettings();
  return false;
}

export async function openAppDefaultSettings(packageName: string): Promise<void> {
  console.log('[AndroidDefaults] openAppDefaultSettings', { packageName, platform: Platform.OS });
  if (Platform.OS !== 'android') return;
  try {
    // This URI opens the specific app's info page in Android settings
    await Linking.openURL(`package:${packageName}`);
    console.log('[AndroidDefaults] opened app settings for:', packageName);
  } catch (_) {
    console.warn('[AndroidDefaults] package: URI failed, falling back to openSettings()');
    await Linking.openSettings();
  }
}

export async function checkRole(role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole (stub)', { role });
  return { role, packageName: '', isDefault: false, isHeld: false, currentDefault: null };
}

export async function getInstalledApps(): Promise<string[]> {
  return [];
}
