import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
}

export async function getCachedRules(): Promise<unknown[]> {
  try {
    const val = await AsyncStorage.getItem(KEYS.CACHED_RULES);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function setCachedRules(rules: unknown[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CACHED_RULES, JSON.stringify(rules));
}

export async function getCachedApps(): Promise<unknown[]> {
  try {
    const val = await AsyncStorage.getItem(KEYS.CACHED_APPS);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function setCachedApps(apps: unknown[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CACHED_APPS, JSON.stringify(apps));
}

export async function getLastSyncedAt(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_SYNCED_AT);
}

export async function setLastSyncedAt(date: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_SYNCED_AT, date);
}

export async function getOfflineMode(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.OFFLINE_MODE);
  return val === 'true';
}

export async function setOfflineMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.OFFLINE_MODE, enabled ? 'true' : 'false');
}

export async function getBiometricLock(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.BIOMETRIC_LOCK);
  return val === 'true';
}

export async function setBiometricLock(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.BIOMETRIC_LOCK, enabled ? 'true' : 'false');
}

export async function clearCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.CACHED_RULES),
    AsyncStorage.removeItem(KEYS.CACHED_APPS),
    AsyncStorage.removeItem(KEYS.LAST_SYNCED_AT),
  ]);
}
