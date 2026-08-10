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
    await openDefaultAppsSettings();
  }
  return false;
}

export async function checkRole(_role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole (stub)', { _role });
  return { role: _role, isHeld: false, currentDefault: null };
}

export async function openDefaultAppsSettings(): Promise<void> {
  console.log('[AndroidDefaults] openDefaultAppsSettings', { platform: Platform.OS });
  if (Platform.OS !== 'android') return;

  try {
    const uri = 'intent:#Intent;action=android.settings.MANAGE_DEFAULT_APPS_SETTINGS;end';
    console.log('[AndroidDefaults] trying MANAGE_DEFAULT_APPS_SETTINGS intent URI');
    await Linking.openURL(uri);
    console.log('[AndroidDefaults] opened MANAGE_DEFAULT_APPS_SETTINGS successfully');
  } catch (e1) {
    console.warn('[AndroidDefaults] MANAGE_DEFAULT_APPS_SETTINGS failed:', e1);
    try {
      const fallbackUri = 'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;end';
      console.log('[AndroidDefaults] trying APPLICATION_SETTINGS intent URI');
      await Linking.openURL(fallbackUri);
      console.log('[AndroidDefaults] opened APPLICATION_SETTINGS successfully');
    } catch (e2) {
      console.warn('[AndroidDefaults] APPLICATION_SETTINGS failed:', e2);
      console.log('[AndroidDefaults] falling back to Linking.openSettings()');
      await Linking.openSettings();
    }
  }
}

export async function openAppDefaultSettings(packageName: string): Promise<void> {
  console.log('[AndroidDefaults] openAppDefaultSettings', { packageName, platform: Platform.OS });
  if (Platform.OS !== 'android') return;

  try {
    const uri = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${packageName};end`;
    console.log('[AndroidDefaults] trying APPLICATION_DETAILS_SETTINGS intent URI for', packageName);
    await Linking.openURL(uri);
    console.log('[AndroidDefaults] opened APPLICATION_DETAILS_SETTINGS successfully for', packageName);
  } catch (e1) {
    console.warn('[AndroidDefaults] APPLICATION_DETAILS_SETTINGS failed for', packageName, ':', e1);
    try {
      const fallbackUri = 'intent:#Intent;action=android.settings.APPLICATION_SETTINGS;end';
      console.log('[AndroidDefaults] trying APPLICATION_SETTINGS intent URI');
      await Linking.openURL(fallbackUri);
      console.log('[AndroidDefaults] opened APPLICATION_SETTINGS successfully');
    } catch (e2) {
      console.warn('[AndroidDefaults] APPLICATION_SETTINGS failed:', e2);
      console.log('[AndroidDefaults] falling back to Linking.openSettings()');
      await Linking.openSettings();
    }
  }
}
