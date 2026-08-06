import { supabase } from './supabase';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://eomrynglzkjeygguvtyw.supabase.co';

async function callEdgeFunction(name: string, method: 'GET' | 'POST', body?: object) {
  console.log(`[API] Calling edge function: ${name}`, { method, body });
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[API] Edge function ${name} failed: ${res.status}`, text);
    throw new Error(`Edge function ${name} failed: ${res.status}`);
  }
  const result = await res.json();
  console.log(`[API] Edge function ${name} response:`, result);
  return result;
}

export const api = {
  resolveIntent: (intentType: string, rawData: object) => {
    console.log('[API] resolveIntent', { intentType, rawData });
    return callEdgeFunction('resolve-intent', 'POST', { intent_type: intentType, raw_data: rawData });
  },
  syncRules: () => {
    console.log('[API] syncRules');
    return callEdgeFunction('sync-rules', 'GET');
  },
  logAnalytics: (events: object[]) => {
    console.log('[API] logAnalytics', { eventCount: events.length });
    return callEdgeFunction('log-analytics', 'POST', { events });
  },
  enrichIntent: (intentType: string, rawData: object) => {
    console.log('[API] enrichIntent', { intentType, rawData });
    return callEdgeFunction('enrich-intent', 'POST', { intent_type: intentType, raw_data: rawData });
  },
};
