import { Linking, Platform } from 'react-native';

export interface DeviceApp {
  packageName: string;
  label: string;
  isDefault: boolean;
}

export interface RoleStatus {
  role: string;
  isHeld: boolean;
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

export async function requestDefaultRole(_role: string): Promise<boolean> {
  console.log('[AndroidDefaults] requestDefaultRole', { _role, platform: Platform.OS });
  if (Platform.OS === 'android') {
    try {
      // ACTION_MANAGE_DEFAULT_APPS_SETTINGS — opens Android's "Default apps" settings screen
      await Linking.openURL('android-app://com.android.settings/.applications.DefaultAppSettings');
      console.log('[AndroidDefaults] opened DefaultAppSettings via android-app URI');
    } catch {
      console.warn('[AndroidDefaults] DefaultAppSettings URI failed, trying package URI');
      try {
        await Linking.openURL('package:com.android.settings');
      } catch {
        console.warn('[AndroidDefaults] package URI failed, falling back to openSettings');
        await Linking.openSettings();
      }
    }
  }
  return false;
}

export async function checkRole(_role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole (stub)', { _role });
  return { role: _role, isHeld: false, currentDefault: null };
}

export async function openDefaultAppsSettings(): Promise<void> {
  console.log('[AndroidDefaults] openDefaultAppsSettings', { platform: Platform.OS });
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL('android-app://com.android.settings/.applications.DefaultAppSettings');
      console.log('[AndroidDefaults] opened DefaultAppSettings via android-app URI');
    } catch {
      console.warn('[AndroidDefaults] android-app URI failed, trying settings action URI');
      try {
        await Linking.openURL('android.settings.MANAGE_DEFAULT_APPS_SETTINGS');
        console.log('[AndroidDefaults] opened via settings action URI');
      } catch {
        console.warn('[AndroidDefaults] settings action URI failed, falling back to openSettings');
        await Linking.openSettings();
      }
    }
  }
}

export async function openAppDefaultSettings(packageName: string): Promise<void> {
  console.log('[AndroidDefaults] openAppDefaultSettings', { packageName, platform: Platform.OS });
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`package:${packageName}`);
      console.log('[AndroidDefaults] opened app settings via package URI:', packageName);
    } catch {
      console.warn('[AndroidDefaults] package URI failed for', packageName, ', falling back to openSettings');
      await Linking.openSettings();
    }
  }
}
