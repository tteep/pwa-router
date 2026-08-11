import { Linking, Platform } from 'react-native';
import {
  getAppsForIntent,
  openDefaultAppsSettings,
  requestDefaultRole,
  DeviceApp,
} from '@/modules/android-defaults';
import { INTENT_TYPE_QUERY } from '@/constants/AndroidRoles';
import { APP_CATALOGUE } from '@/constants/AppCatalogue';
import { RoutingRule, PwaApp, buildPwaUrl } from '@/utils/routing-engine';

// Returns apps installed on the device that can handle a given intent_type.
// Falls back to AppCatalogue demo entries when the native module returns empty (e.g. Expo Go).
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

    if (apps.length > 0) return apps;

    // Fallback: use AppCatalogue entries as demo/stub apps when native module returns empty
    const catalogueApps = APP_CATALOGUE[intentType] ?? [];
    console.log('[DeviceApps] using AppCatalogue fallback for', intentType, '— entries:', catalogueApps.length);
    return catalogueApps.map((entry) => ({
      packageName: entry.package_name,
      label: entry.display_name,
      isDefault: false,
    }));
  } catch (e) {
    console.warn('[DeviceApps] queryDeviceAppsForType error, using AppCatalogue fallback', e);
    const catalogueApps = APP_CATALOGUE[intentType] ?? [];
    return catalogueApps.map((entry) => ({
      packageName: entry.package_name,
      label: entry.display_name,
      isDefault: false,
    }));
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

export interface ExecuteIntentResult {
  opened: boolean;
  destination: string;
  isPwa: boolean;
  finalUrl: string;
}

/**
 * Executes an intent by routing it to a PWA or native app.
 * Priority:
 *   1. Rule with dest_pwa_url → open that PWA URL
 *   2. Rule without dest_pwa_url → check pwaApps for a matching active PWA
 *   3. Fallback to native URI scheme
 */
export async function executeIntent(
  intentType: string,
  rawData: Record<string, unknown>,
  rule: RoutingRule | null,
  pwaApps: PwaApp[]
): Promise<ExecuteIntentResult> {
  console.log('[DeviceApps] executeIntent', { intentType, rawData, rule: rule?.name ?? null, pwaAppsCount: pwaApps.length });

  // 1. Rule with explicit PWA URL
  if (rule !== null && rule.dest_pwa_url) {
    const finalUrl = buildPwaUrl(rule.dest_pwa_url, intentType, rawData);
    console.log('[DeviceApps] routing to rule PWA URL:', finalUrl);
    try {
      await Linking.openURL(finalUrl);
    } catch (err) {
      console.error('[DeviceApps] failed to open PWA URL:', err);
    }
    return {
      opened: true,
      destination: rule.dest_pwa_name ?? rule.dest_display_name ?? 'PWA',
      isPwa: true,
      finalUrl,
    };
  }

  // 2. Rule without PWA URL → check pwaApps for a matching active PWA
  if (rule !== null && !rule.dest_pwa_url) {
    const matchingPwa = pwaApps.find(
      (p) => p.is_active && p.intent_types.includes(intentType)
    );
    if (matchingPwa) {
      const finalUrl = buildPwaUrl(matchingPwa.url, intentType, rawData);
      console.log('[DeviceApps] routing to pwaApps match:', matchingPwa.name, finalUrl);
      try {
        await Linking.openURL(finalUrl);
      } catch (err) {
        console.error('[DeviceApps] failed to open pwaApps URL:', err);
      }
      return {
        opened: true,
        destination: matchingPwa.name,
        isPwa: true,
        finalUrl,
      };
    }
  }

  // 3. Native fallback
  const nativeUrl = buildNativeUrl(intentType, rawData);
  console.log('[DeviceApps] native fallback URL:', nativeUrl);
  try {
    if (nativeUrl) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openSettings();
    }
  } catch (err) {
    console.error('[DeviceApps] native open error:', err);
  }

  return {
    opened: true,
    destination: rule?.dest_display_name ?? 'System',
    isPwa: false,
    finalUrl: nativeUrl,
  };
}

function buildNativeUrl(intentType: string, rawData: Record<string, unknown>): string {
  switch (intentType) {
    case 'email':
      return `mailto:${String(rawData.recipient ?? '')}?subject=${encodeURIComponent(String(rawData.subject ?? ''))}`;
    case 'tel':
      return `tel:${String(rawData.number ?? rawData.phone_number ?? '')}`;
    case 'geo':
      return `geo:0,0?q=${encodeURIComponent(String(rawData.address ?? ''))}`;
    case 'browser':
      return String(rawData.url ?? 'https://google.com');
    case 'text':
      return `sms:${String(rawData.number ?? rawData.phone_number ?? '')}`;
    default:
      return '';
  }
}
