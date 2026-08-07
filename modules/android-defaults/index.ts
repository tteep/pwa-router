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
  console.log('[AndroidDefaults] requestDefaultRole (stub)', { _role });
  if (Platform.OS === 'android') {
    await Linking.openSettings();
  }
  return false;
}

export async function checkRole(_role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole (stub)', { _role });
  return { role: _role, isHeld: false, currentDefault: null };
}

export async function openDefaultAppsSettings(): Promise<void> {
  console.log('[AndroidDefaults] openDefaultAppsSettings (stub)');
  if (Platform.OS === 'android') {
    await Linking.openSettings();
  }
}

export async function openAppDefaultSettings(_packageName: string): Promise<void> {
  console.log('[AndroidDefaults] openAppDefaultSettings (stub)', { _packageName });
  if (Platform.OS === 'android') {
    await Linking.openSettings();
  }
}
