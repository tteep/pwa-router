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
  console.log('[AndroidDefaults] openDefaultAppsSettings');
  Alert.alert(
    'Default Apps Settings',
    'To set system-wide default apps, go to:\n\nSettings → Apps → Default Apps\n\nNote: Gatsby Router handles routing internally — tap "Test Intent" in the app to route links through your PWA.',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'OK', style: 'cancel' },
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
    await Linking.openURL(`app-settings:`);
    console.log('[AndroidDefaults] opened app-settings for:', packageName);
  } catch {
    console.warn('[AndroidDefaults] app-settings: URI failed, falling back to openSettings()');
    Linking.openSettings();
  }
}

export async function checkRole(role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole (stub)', { role });
  return { role, packageName: '', isDefault: false, isHeld: false, currentDefault: null };
}

export async function getInstalledApps(): Promise<string[]> {
  return [];
}
