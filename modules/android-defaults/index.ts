import { Linking, Platform, Alert } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

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

// Load native module only on Android; returns null on iOS/web
const NativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule('AndroidDefaults')
  : null;

export async function getAppsForIntent(action: string, mimeType?: string, scheme?: string): Promise<DeviceApp[]> {
  console.log('[AndroidDefaults] getAppsForIntent', { action, mimeType, scheme });
  if (NativeModule) {
    try {
      return await NativeModule.getAppsForIntent(action, mimeType ?? null, scheme ?? null);
    } catch (e) {
      console.warn('[AndroidDefaults] getAppsForIntent native error', e);
    }
  }
  return [];
}

export async function getHandlersForScheme(scheme: string): Promise<DeviceApp[]> {
  console.log('[AndroidDefaults] getHandlersForScheme', { scheme });
  if (NativeModule) {
    try {
      return await NativeModule.getHandlersForScheme(scheme);
    } catch (e) {
      console.warn('[AndroidDefaults] getHandlersForScheme native error', e);
    }
  }
  return [];
}

export async function openDefaultAppsSettings(): Promise<void> {
  console.log('[AndroidDefaults] openDefaultAppsSettings');
  if (NativeModule) {
    try {
      await NativeModule.openDefaultAppsSettings();
      return;
    } catch (e) {
      console.warn('[AndroidDefaults] openDefaultAppsSettings native error', e);
    }
  }
  // JS fallback
  if (Platform.OS !== 'android') return;
  Alert.alert(
    'Default Apps Settings',
    'To set system-wide default apps, go to:\n\nSettings → Apps → Default Apps',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'OK', style: 'cancel' },
    ]
  );
}

export async function requestDefaultRole(role: string, packageName?: string): Promise<boolean> {
  console.log('[AndroidDefaults] requestDefaultRole', { role, packageName, platform: Platform.OS });
  if (NativeModule) {
    try {
      return await NativeModule.requestDefaultRole(role, packageName ?? null);
    } catch (e) {
      console.warn('[AndroidDefaults] requestDefaultRole native error', e);
    }
  }
  if (Platform.OS !== 'android') return false;
  await openDefaultAppsSettings();
  return false;
}

export async function openAppDefaultSettings(packageName: string): Promise<void> {
  console.log('[AndroidDefaults] openAppDefaultSettings', { packageName, platform: Platform.OS });
  if (NativeModule) {
    try {
      await NativeModule.openAppDefaultSettings(packageName);
      return;
    } catch (e) {
      console.warn('[AndroidDefaults] openAppDefaultSettings native error', e);
    }
  }
  if (Platform.OS !== 'android') return;
  try {
    await Linking.openURL(`app-settings:`);
  } catch {
    Linking.openSettings();
  }
}

export async function checkRole(role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole', { role });
  if (NativeModule) {
    try {
      return await NativeModule.checkRole(role);
    } catch (e) {
      console.warn('[AndroidDefaults] checkRole native error', e);
    }
  }
  return { role, packageName: '', isDefault: false, isHeld: false, currentDefault: null };
}

export async function getInstalledApps(): Promise<string[]> {
  console.log('[AndroidDefaults] getInstalledApps');
  if (NativeModule) {
    try {
      return await NativeModule.getInstalledApps();
    } catch (e) {
      console.warn('[AndroidDefaults] getInstalledApps native error', e);
    }
  }
  return [];
}
