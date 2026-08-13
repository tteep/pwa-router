/**
 * Gatsby Router Native Bridge
 *
 * Allows trusted Gatsby PWA origins to request native Android capabilities
 * via postMessage over a WebView. Only origins in the TRUSTED_ORIGINS allowlist
 * are permitted to invoke native capabilities.
 *
 * Architecture:
 *   PWA (WebView) → postMessage({ id, capability, params })
 *       → NativeBridge validates origin
 *       → executes capability
 *       → postMessage back { id, result, error }
 */

export type BridgeCapability =
  | 'camera'
  | 'pickFile'
  | 'saveFile'
  | 'share'
  | 'getLocation'
  | 'getContact'
  | 'openPhone'
  | 'openMaps';

export interface BridgeRequest {
  id: string;           // UUID, used to correlate response
  capability: BridgeCapability;
  params: Record<string, unknown>;
  origin: string;       // PWA origin, validated against allowlist
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

// Trusted PWA origins allowlist — loaded from pwa_apps.url origins
// Only these origins may invoke native capabilities
export function extractOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

export function isTrustedOrigin(origin: string, trustedOrigins: string[]): boolean {
  return trustedOrigins.some((trusted) => trusted === origin);
}

/**
 * Builds the JS snippet to inject into a WebView that exposes GatsbyNative API.
 * The PWA calls these methods; the WebView fires onMessage back to the native layer.
 */
export function buildBridgeInjection(): string {
  return `
(function() {
  if (window.GatsbyNative) return;

  const pending = {};

  window.GatsbyNative = {
    _call: function(capability, params) {
      return new Promise(function(resolve, reject) {
        const id = Math.random().toString(36).slice(2);
        pending[id] = { resolve, reject };
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id,
          capability,
          params: params || {},
          origin: window.location.origin,
        }));
        setTimeout(function() {
          if (pending[id]) {
            delete pending[id];
            reject(new Error('Bridge timeout'));
          }
        }, 30000);
      });
    },
    _resolve: function(id, result) {
      if (pending[id]) {
        pending[id].resolve(result);
        delete pending[id];
      }
    },
    _reject: function(id, error) {
      if (pending[id]) {
        pending[id].reject(new Error(error));
        delete pending[id];
      }
    },
    openCamera:  function(p) { return this._call('camera', p); },
    pickFile:    function(p) { return this._call('pickFile', p); },
    saveFile:    function(p) { return this._call('saveFile', p); },
    share:       function(p) { return this._call('share', p); },
    getLocation: function(p) { return this._call('getLocation', p); },
    getContact:  function(p) { return this._call('getContact', p); },
    openPhone:   function(p) { return this._call('openPhone', p); },
    openMaps:    function(p) { return this._call('openMaps', p); },
  };

  // Listen for responses from native layer
  document.addEventListener('message', function(e) {
    try {
      const msg = JSON.parse(e.data);
      if (msg.success) {
        window.GatsbyNative._resolve(msg.id, msg.result);
      } else {
        window.GatsbyNative._reject(msg.id, msg.error || 'Unknown error');
      }
    } catch {}
  });
})();
  `.trim();
}

/**
 * Handles an incoming bridge message from a WebView.
 * Returns a BridgeResponse to send back.
 *
 * Phase 1: validates origin and returns structured response.
 * Phase 2+: will dispatch to actual native capability handlers.
 */
export async function handleBridgeMessage(
  raw: string,
  trustedOrigins: string[]
): Promise<BridgeResponse> {
  let req: BridgeRequest;
  try {
    req = JSON.parse(raw) as BridgeRequest;
  } catch {
    return { id: '', success: false, error: 'Invalid message format' };
  }

  console.log('[NativeBridge] incoming request:', req.capability, 'from', req.origin);

  if (!isTrustedOrigin(req.origin, trustedOrigins)) {
    console.warn('[NativeBridge] BLOCKED untrusted origin:', req.origin);
    return { id: req.id, success: false, error: `Origin not trusted: ${req.origin}` };
  }

  // Phase 1: capability stubs — return structured "not yet implemented" responses
  // that the PWA can handle gracefully. Phase 2+ will implement each capability.
  switch (req.capability) {
    case 'share': {
      // Share is safe to implement now via Linking
      const { Linking } = await import('react-native');
      const text = String(req.params.text ?? '');
      const url = String(req.params.url ?? '');
      try {
        // Use expo-sharing if available, fallback to Linking
        const ExpoSharing = await import('expo-sharing');
        const available = await ExpoSharing.isAvailableAsync();
        if (available && url) {
          await ExpoSharing.shareAsync(url);
          return { id: req.id, success: true, result: { shared: true } };
        }
      } catch {}
      // Fallback: open URL
      if (url) await Linking.openURL(url);
      return { id: req.id, success: true, result: { shared: true, text, url } };
    }
    case 'openPhone': {
      const { Linking } = await import('react-native');
      const tel = String(req.params.number ?? '');
      if (tel) await Linking.openURL(`tel:${tel}`);
      return { id: req.id, success: true, result: { opened: true } };
    }
    case 'openMaps': {
      const { Linking } = await import('react-native');
      const q = String(req.params.query ?? req.params.address ?? '');
      if (q) await Linking.openURL(`geo:0,0?q=${encodeURIComponent(q)}`);
      return { id: req.id, success: true, result: { opened: true } };
    }
    case 'camera':
    case 'pickFile':
    case 'saveFile':
    case 'getLocation':
    case 'getContact':
      // Phase 2+ capabilities — return structured stub
      return {
        id: req.id,
        success: false,
        error: `Capability '${req.capability}' requires Phase 2 implementation`,
      };
    default:
      return { id: req.id, success: false, error: `Unknown capability: ${(req as BridgeRequest).capability}` };
  }
}
