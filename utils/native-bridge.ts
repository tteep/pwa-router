import { Linking, Share } from 'react-native';
import { supabase } from '@/utils/supabase';

// ─── Capability tiers ─────────────────────────────────────────────────────────

export const TIER1_CAPABILITIES = ['share', 'phone', 'maps'] as const;
export const TIER2_CAPABILITIES = ['camera', 'pickFile', 'saveFile', 'location', 'contact'] as const;

export type Tier1Capability = typeof TIER1_CAPABILITIES[number];
export type Tier2Capability = typeof TIER2_CAPABILITIES[number];
export type BridgeCapability = Tier1Capability | Tier2Capability;

// ─── Request / Response types ─────────────────────────────────────────────────

export interface NativeRequest {
  id: string;
  capability: BridgeCapability;
  ts: number;           // unix ms timestamp from PWA
  callback: string;     // HTTPS URL to deliver result to
  params: Record<string, string>;
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export const BridgeErrorCode = {
  UNSUPPORTED_CAPABILITY: 'UNSUPPORTED_CAPABILITY',
  INVALID_REQUEST:        'INVALID_REQUEST',
  EXPIRED_REQUEST:        'EXPIRED_REQUEST',
  INVALID_CALLBACK:       'INVALID_CALLBACK',
  MISSING_PARAMETER:      'MISSING_PARAMETER',
  CAPABILITY_UNAVAILABLE: 'CAPABILITY_UNAVAILABLE',
  USER_CANCELLED:         'USER_CANCELLED',
  UNTRUSTED_CALLBACK:     'UNTRUSTED_CALLBACK',
} as const;

// ─── Origin helpers ───────────────────────────────────────────────────────────

export function extractOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

export function isTrustedOrigin(origin: string, trustedOrigins: string[]): boolean {
  return trustedOrigins.some((t) => t === origin);
}

// ─── Parse incoming gatsbyrouter://native/<cap>?... URL ───────────────────────

export function parseNativeRequest(url: string): NativeRequest | null {
  try {
    // url looks like: gatsbyrouter://native/share?id=...&ts=...&callback=...&text=...
    const u = new URL(url);
    if (u.protocol !== 'gatsbyrouter:') return null;
    if (u.hostname !== 'native') return null;

    const capability = u.pathname.replace(/^\//, '') as BridgeCapability;
    const id = u.searchParams.get('id') ?? '';
    const tsStr = u.searchParams.get('ts') ?? '';
    const callback = u.searchParams.get('callback') ?? '';

    if (!id || !tsStr || !callback || !capability) return null;

    const ts = parseInt(tsStr, 10);
    if (isNaN(ts)) return null;

    // Collect remaining params (everything except id, ts, callback)
    const params: Record<string, string> = {};
    u.searchParams.forEach((value, key) => {
      if (key !== 'id' && key !== 'ts' && key !== 'callback') {
        params[key] = value;
      }
    });

    return { id, capability, ts, callback, params };
  } catch {
    return null;
  }
}

// ─── Validate a parsed request ────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errorCode?: string;
  error?: string;
}

export function validateNativeRequest(req: NativeRequest): ValidationResult {
  // 1. Expiry check — reject requests older than 60 seconds
  const ageMs = Date.now() - req.ts;
  if (ageMs > 60_000 || ageMs < -5_000) {
    return { valid: false, errorCode: BridgeErrorCode.EXPIRED_REQUEST, error: 'Request expired' };
  }

  // 2. Callback URL must be valid and HTTPS (or localhost for dev)
  let callbackUrl: URL;
  try {
    callbackUrl = new URL(req.callback);
  } catch {
    return { valid: false, errorCode: BridgeErrorCode.INVALID_CALLBACK, error: 'Invalid callback URL' };
  }
  const isLocalhost = callbackUrl.hostname === 'localhost' || callbackUrl.hostname === '127.0.0.1';
  if (callbackUrl.protocol !== 'https:' && !isLocalhost) {
    return { valid: false, errorCode: BridgeErrorCode.INVALID_CALLBACK, error: 'Callback must use HTTPS' };
  }

  // 3. Capability must be known
  const allCaps: string[] = [...TIER1_CAPABILITIES, ...TIER2_CAPABILITIES];
  if (!allCaps.includes(req.capability)) {
    return { valid: false, errorCode: BridgeErrorCode.UNSUPPORTED_CAPABILITY, error: `Unknown capability: ${req.capability}` };
  }

  return { valid: true };
}

// ─── Build callback URL safely (never string-concatenate) ─────────────────────

export function buildCallbackUrl(callbackBase: string, response: BridgeResponse): string {
  try {
    const u = new URL(callbackBase);
    u.searchParams.set('id', response.id);
    u.searchParams.set('success', String(response.success));
    if (response.result !== undefined) {
      u.searchParams.set('result', JSON.stringify(response.result));
    }
    if (response.error !== undefined) {
      u.searchParams.set('error', response.error);
    }
    if (response.errorCode !== undefined) {
      u.searchParams.set('errorCode', response.errorCode);
    }
    return u.toString();
  } catch {
    return callbackBase;
  }
}

// ─── Execute a validated Tier 1 capability ────────────────────────────────────

export async function executeNativeCapability(
  req: NativeRequest
): Promise<BridgeResponse> {
  const { id, capability, params } = req;

  console.log('[NativeBridge] executeNativeCapability', { id, capability, params });

  // Tier 2 — not yet implemented, return structured error
  if ((TIER2_CAPABILITIES as readonly string[]).includes(capability)) {
    console.log('[NativeBridge] tier2 capability not yet available:', capability);
    return {
      id,
      success: false,
      errorCode: BridgeErrorCode.CAPABILITY_UNAVAILABLE,
      error: `Capability '${capability}' requires explicit user authorization (Phase 2)`,
    };
  }

  switch (capability as Tier1Capability) {
    case 'share': {
      const text = params.text ?? '';
      const url  = params.url  ?? '';
      const title = params.title ?? '';
      console.log('[NativeBridge] share capability invoked', { text: !!text, url: !!url });
      try {
        await Share.share({ message: text || url, url: url || undefined, title: title || undefined });
        console.log('[NativeBridge] share completed successfully');
        return { id, success: true, result: { shared: true } };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('cancel') || msg.includes('Cancel')) {
          console.log('[NativeBridge] share cancelled by user');
          return { id, success: false, errorCode: BridgeErrorCode.USER_CANCELLED, error: 'User cancelled share' };
        }
        console.warn('[NativeBridge] share error:', msg);
        return { id, success: false, errorCode: BridgeErrorCode.CAPABILITY_UNAVAILABLE, error: msg };
      }
    }

    case 'phone': {
      const number = params.number ?? params.tel ?? '';
      if (!number) {
        console.warn('[NativeBridge] phone capability missing number param');
        return { id, success: false, errorCode: BridgeErrorCode.MISSING_PARAMETER, error: 'Missing parameter: number' };
      }
      // Only open the dialer — never auto-dial
      const dialUrl = `tel:${number}`;
      console.log('[NativeBridge] phone capability opening dialer');
      try {
        const canOpen = await Linking.canOpenURL(dialUrl);
        if (!canOpen) {
          console.warn('[NativeBridge] dialer not available');
          return { id, success: false, errorCode: BridgeErrorCode.CAPABILITY_UNAVAILABLE, error: 'Dialer not available' };
        }
        await Linking.openURL(dialUrl);
        console.log('[NativeBridge] dialer opened successfully');
        return { id, success: true, result: { opened: true, number } };
      } catch (err: unknown) {
        console.warn('[NativeBridge] phone error:', err);
        return { id, success: false, errorCode: BridgeErrorCode.CAPABILITY_UNAVAILABLE, error: String(err) };
      }
    }

    case 'maps': {
      const query   = params.query   ?? params.address ?? '';
      const lat     = params.lat     ?? '';
      const lng     = params.lng     ?? '';
      let mapsUrl: string;
      if (lat && lng) {
        mapsUrl = `geo:${lat},${lng}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
      } else if (query) {
        mapsUrl = `geo:0,0?q=${encodeURIComponent(query)}`;
      } else {
        console.warn('[NativeBridge] maps capability missing location params');
        return { id, success: false, errorCode: BridgeErrorCode.MISSING_PARAMETER, error: 'Missing parameter: query, address, or lat+lng' };
      }
      console.log('[NativeBridge] maps capability opening:', mapsUrl);
      try {
        await Linking.openURL(mapsUrl);
        console.log('[NativeBridge] maps opened successfully');
        return { id, success: true, result: { opened: true } };
      } catch (err: unknown) {
        console.warn('[NativeBridge] maps error:', err);
        return { id, success: false, errorCode: BridgeErrorCode.CAPABILITY_UNAVAILABLE, error: String(err) };
      }
    }

    default:
      console.warn('[NativeBridge] unsupported capability:', capability);
      return { id, success: false, errorCode: BridgeErrorCode.UNSUPPORTED_CAPABILITY, error: `Unsupported capability: ${capability}` };
  }
}

// ─── Load trusted origins from pwa_apps table ─────────────────────────────────

export async function loadTrustedOrigins(userId: string): Promise<string[]> {
  console.log('[NativeBridge] loadTrustedOrigins for user:', userId);
  try {
    const { data, error } = await supabase
      .from('pwa_apps')
      .select('url')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error || !data) {
      console.warn('[NativeBridge] loadTrustedOrigins error:', error?.message);
      return [];
    }
    const origins = data.map((row: { url: string }) => extractOrigin(row.url)).filter(Boolean);
    console.log('[NativeBridge] trusted origins loaded:', origins.length);
    return origins;
  } catch {
    return [];
  }
}
