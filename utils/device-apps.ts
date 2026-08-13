import { Linking } from 'react-native';
import { RoutingRule, PwaApp, buildPwaUrl } from '@/utils/routing-engine';
import { supabase } from '@/utils/supabase';

export interface ExecuteIntentResult {
  opened: boolean;
  destination: string;
  isPwa: boolean;
  finalUrl: string;
}

async function writeIntentHistory(
  userId: string | null,
  intentType: string,
  destinationName: string,
  result: 'success' | 'error',
  latencyMs: number
): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase.from('intent_history').insert({
      user_id: userId,
      intent_type: intentType,
      dest_display_name: destinationName,
      result,
      latency_ms: latencyMs,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[DeviceApps] intent_history insert error:', error.message);
    } else {
      console.log('[DeviceApps] intent_history written', { intentType, destinationName, result, latencyMs });
    }
  } catch (err) {
    console.warn('[DeviceApps] intent_history insert exception:', err);
  }
}

/**
 * Executes an intent by routing it to a PWA or native URI.
 * Priority:
 *   1. Rule with dest_pwa_url → open that PWA URL
 *   2. Rule without dest_pwa_url → find first active pwaApp matching intentType
 *   3. No rule → find first active pwaApp matching intentType
 *   4. Native fallback URI scheme
 */
export async function executeIntent(
  intentType: string,
  rawData: Record<string, unknown>,
  rule: RoutingRule | null,
  pwaApps: PwaApp[],
  userId: string | null
): Promise<ExecuteIntentResult> {
  console.log('[DeviceApps] executeIntent', {
    intentType,
    rawData,
    rule: rule?.name ?? null,
    pwaAppsCount: pwaApps.length,
    userId: userId ?? 'guest',
  });

  const startTime = Date.now();

  // 1. Rule with explicit PWA URL
  if (rule !== null && rule.dest_pwa_url) {
    const finalUrl = buildPwaUrl(rule.dest_pwa_url, intentType, rawData);
    const destination = rule.dest_pwa_name ?? rule.dest_display_name ?? 'PWA';
    console.log('[DeviceApps] routing to rule PWA URL:', finalUrl);
    try {
      await Linking.openURL(finalUrl);
      const latencyMs = Date.now() - startTime;
      await writeIntentHistory(userId, intentType, destination, 'success', latencyMs);
    } catch (err) {
      console.error('[DeviceApps] failed to open rule PWA URL:', err);
      const latencyMs = Date.now() - startTime;
      await writeIntentHistory(userId, intentType, destination, 'error', latencyMs);
    }
    return {
      opened: true,
      destination,
      isPwa: true,
      finalUrl,
    };
  }

  // 2. Rule without PWA URL → find first active pwaApp for this intent type
  if (rule !== null && !rule.dest_pwa_url) {
    const matchingPwa = pwaApps.find(
      (p) => p.is_active && p.intent_types.includes(intentType)
    );
    if (matchingPwa) {
      const finalUrl = buildPwaUrl(matchingPwa.url, intentType, rawData);
      console.log('[DeviceApps] routing to pwaApps match (rule, no pwa_url):', matchingPwa.name, finalUrl);
      try {
        await Linking.openURL(finalUrl);
        const latencyMs = Date.now() - startTime;
        await writeIntentHistory(userId, intentType, matchingPwa.name, 'success', latencyMs);
      } catch (err) {
        console.error('[DeviceApps] failed to open pwaApps URL:', err);
        const latencyMs = Date.now() - startTime;
        await writeIntentHistory(userId, intentType, matchingPwa.name, 'error', latencyMs);
      }
      return {
        opened: true,
        destination: matchingPwa.name,
        isPwa: true,
        finalUrl,
      };
    }
  }

  // 3. No rule → find first active pwaApp for this intent type
  if (rule === null) {
    const matchingPwa = pwaApps.find(
      (p) => p.is_active && p.intent_types.includes(intentType)
    );
    if (matchingPwa) {
      const finalUrl = buildPwaUrl(matchingPwa.url, intentType, rawData);
      console.log('[DeviceApps] routing to pwaApps match (no rule):', matchingPwa.name, finalUrl);
      try {
        await Linking.openURL(finalUrl);
        const latencyMs = Date.now() - startTime;
        await writeIntentHistory(userId, intentType, matchingPwa.name, 'success', latencyMs);
      } catch (err) {
        console.error('[DeviceApps] failed to open pwaApps URL:', err);
        const latencyMs = Date.now() - startTime;
        await writeIntentHistory(userId, intentType, matchingPwa.name, 'error', latencyMs);
      }
      return {
        opened: true,
        destination: matchingPwa.name,
        isPwa: true,
        finalUrl,
      };
    }
  }

  // 4. Native fallback
  const nativeUrl = buildNativeUrl(intentType, rawData);
  const nativeDestination = rule?.dest_display_name ?? 'System';
  console.log('[DeviceApps] native fallback URL:', nativeUrl);
  try {
    if (nativeUrl) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openSettings();
    }
    const latencyMs = Date.now() - startTime;
    await writeIntentHistory(userId, intentType, nativeDestination, 'success', latencyMs);
  } catch (err) {
    console.error('[DeviceApps] native open error:', err);
    const latencyMs = Date.now() - startTime;
    await writeIntentHistory(userId, intentType, nativeDestination, 'error', latencyMs);
  }

  return {
    opened: true,
    destination: nativeDestination,
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
