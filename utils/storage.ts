import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  CACHED_RULES: 'cached_rules',
  CACHED_APPS: 'cached_apps',
  LAST_SYNCED_AT: 'last_synced_at',
  OFFLINE_MODE: 'offline_mode',
  BIOMETRIC_LOCK: 'biometric_lock',
} as const;

export { KEYS };

export async function getOnboardingComplete(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.ONBOARDING_COMPLETE);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ONBOARDING_COMPLETE, 'true');
}

export async function getCachedRules(): Promise<unknown[]> {
  try {
    const val = await SecureStore.getItemAsync(KEYS.CACHED_RULES);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function setCachedRules(rules: unknown[]): Promise<void> {
  await SecureStore.setItemAsync(KEYS.CACHED_RULES, JSON.stringify(rules));
}

export async function getCachedApps(): Promise<unknown[]> {
  try {
    const val = await SecureStore.getItemAsync(KEYS.CACHED_APPS);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function setCachedApps(apps: unknown[]): Promise<void> {
  await SecureStore.setItemAsync(KEYS.CACHED_APPS, JSON.stringify(apps));
}

export async function getLastSyncedAt(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.LAST_SYNCED_AT);
}

export async function setLastSyncedAt(date: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.LAST_SYNCED_AT, date);
}

export async function getOfflineMode(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.OFFLINE_MODE);
  return val === 'true';
}

export async function setOfflineMode(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.OFFLINE_MODE, enabled ? 'true' : 'false');
}

export async function getBiometricLock(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.BIOMETRIC_LOCK);
  return val === 'true';
}

export async function setBiometricLock(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_LOCK, enabled ? 'true' : 'false');
}

export async function clearCache(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.CACHED_RULES),
    SecureStore.deleteItemAsync(KEYS.CACHED_APPS),
    SecureStore.deleteItemAsync(KEYS.LAST_SYNCED_AT),
  ]);
}
