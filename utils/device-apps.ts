import { Platform } from 'react-native';
import {
  getAppsForIntent,
  openDefaultAppsSettings,
  requestDefaultRole,
  DeviceApp,
} from '@/modules/android-defaults';
import { INTENT_TYPE_QUERY } from '@/constants/AndroidRoles';

// Returns apps installed on the device that can handle a given intent_type
export async function queryDeviceAppsForType(intentType: string): Promise<DeviceApp[]> {
  console.log('[DeviceApps] queryDeviceAppsForType', { intentType, platform: Platform.OS });
  if (Platform.OS !== 'android') return [];
  const query = INTENT_TYPE_QUERY[intentType];
  if (!query) {
    console.warn('[DeviceApps] no query config for intentType:', intentType);
    return [];
  }
  try {
    const apps = await getAppsForIntent(query.action, query.mimeType, query.scheme);
    console.log('[DeviceApps] queryDeviceAppsForType result', { intentType, count: apps.length });
    return apps;
  } catch (e) {
    console.warn('[DeviceApps] queryDeviceAppsForType error', e);
    return [];
  }
}

// Request this app to become the default for a role
export async function requestBecomeDefault(intentType: string): Promise<boolean> {
  console.log('[DeviceApps] requestBecomeDefault', { intentType, platform: Platform.OS });
  if (Platform.OS !== 'android') return false;
  const query = INTENT_TYPE_QUERY[intentType];
  if (!query?.role) {
    console.log('[DeviceApps] no role for intentType, opening default apps settings:', intentType);
    await openDefaultAppsSettings();
    return false;
  }
  const result = await requestDefaultRole(query.role);
  console.log('[DeviceApps] requestBecomeDefault result', { intentType, result });
  return result;
}
