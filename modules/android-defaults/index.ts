import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

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

// Stub for non-Android platforms
const stub = {
  getAppsForIntent: async (_action: string, _mimeType?: string, _scheme?: string): Promise<DeviceApp[]> => [],
  getHandlersForScheme: async (_scheme: string): Promise<DeviceApp[]> => [],
  requestDefaultRole: async (_role: string): Promise<boolean> => false,
  checkRole: async (role: string): Promise<RoleStatus> => ({ role, isHeld: false, currentDefault: null }),
  openDefaultAppsSettings: async (): Promise<void> => {},
  openAppDefaultSettings: async (_packageName: string): Promise<void> => {},
};

const AndroidDefaults = Platform.OS === 'android'
  ? requireNativeModule('AndroidDefaults')
  : stub;

export function getAppsForIntent(action: string, mimeType?: string, scheme?: string): Promise<DeviceApp[]> {
  console.log('[AndroidDefaults] getAppsForIntent', { action, mimeType, scheme });
  return AndroidDefaults.getAppsForIntent(action, mimeType ?? null, scheme ?? null);
}

export function getHandlersForScheme(scheme: string): Promise<DeviceApp[]> {
  console.log('[AndroidDefaults] getHandlersForScheme', { scheme });
  return AndroidDefaults.getHandlersForScheme(scheme);
}

export function requestDefaultRole(role: string): Promise<boolean> {
  console.log('[AndroidDefaults] requestDefaultRole', { role });
  return AndroidDefaults.requestDefaultRole(role);
}

export function checkRole(role: string): Promise<RoleStatus> {
  console.log('[AndroidDefaults] checkRole', { role });
  return AndroidDefaults.checkRole(role);
}

export function openDefaultAppsSettings(): Promise<void> {
  console.log('[AndroidDefaults] openDefaultAppsSettings');
  return AndroidDefaults.openDefaultAppsSettings();
}

export function openAppDefaultSettings(packageName: string): Promise<void> {
  console.log('[AndroidDefaults] openAppDefaultSettings', { packageName });
  return AndroidDefaults.openAppDefaultSettings(packageName);
}
