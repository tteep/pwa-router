import React, { createContext, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { RoutingRule, evaluateRules } from '@/utils/routing-engine';
import {
  getCachedRules,
  setCachedRules,
  getCachedApps,
  setCachedApps,
  getLastSyncedAt,
  setLastSyncedAt,
  getOfflineMode,
} from '@/utils/storage';
import { useAuth } from '@/contexts/AuthContext';

export interface InstalledApp {
  id: string;
  display_name: string;
  package_name: string;
  intent_type: string;
  is_enabled: boolean;
  user_id?: string;
}

interface RoutingContextType {
  rules: RoutingRule[];
  apps: InstalledApp[];
  isOffline: boolean;
  lastSyncedAt: string | null;
  loading: boolean;
  resolveIntent: (intentType: string, rawData: Record<string, unknown>) => RoutingRule | null;
  syncRules: () => Promise<void>;
  refreshRules: () => Promise<void>;
  refreshApps: () => Promise<void>;
}

const RoutingContext = createContext<RoutingContextType>(null!);

export function useRouting() {
  return React.use(RoutingContext);
}

// Demo data for guest mode
const DEMO_RULES: RoutingRule[] = [
  {
    id: 'demo-1',
    name: 'Work emails → Outlook',
    intent_type: 'email',
    condition_field: 'recipient',
    condition_operator: 'contains',
    condition_value: '@company.com',
    destination_package: 'com.microsoft.outlook',
    destination_display_name: 'Outlook',
    priority: 90,
    is_active: true,
  },
  {
    id: 'demo-2',
    name: 'Default email → Gmail',
    intent_type: 'email',
    condition_field: null,
    condition_operator: null,
    condition_value: null,
    destination_package: 'com.google.android.gm',
    destination_display_name: 'Gmail',
    priority: 10,
    is_active: true,
  },
  {
    id: 'demo-3',
    name: 'Maps → Google Maps',
    intent_type: 'geo',
    condition_field: null,
    condition_operator: null,
    condition_value: null,
    destination_package: 'com.google.android.apps.maps',
    destination_display_name: 'Google Maps',
    priority: 50,
    is_active: true,
  },
  {
    id: 'demo-4',
    name: 'PDFs → Adobe Reader',
    intent_type: 'pdf',
    condition_field: null,
    condition_operator: null,
    condition_value: null,
    destination_package: 'com.adobe.reader',
    destination_display_name: 'Adobe Reader',
    priority: 50,
    is_active: false,
  },
];

const DEMO_APPS: InstalledApp[] = [
  { id: 'app-1', display_name: 'Gmail', package_name: 'com.google.android.gm', intent_type: 'email', is_enabled: true },
  { id: 'app-2', display_name: 'Outlook', package_name: 'com.microsoft.outlook', intent_type: 'email', is_enabled: true },
  { id: 'app-3', display_name: 'Google Maps', package_name: 'com.google.android.apps.maps', intent_type: 'geo', is_enabled: true },
  { id: 'app-4', display_name: 'Chrome', package_name: 'com.android.chrome', intent_type: 'browser', is_enabled: true },
  { id: 'app-5', display_name: 'Adobe Reader', package_name: 'com.adobe.reader', intent_type: 'pdf', is_enabled: false },
];

export function RoutingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRules = useCallback(async () => {
    console.log('[Routing] refreshRules', { userId: user?.id });
    if (!user) {
      setRules(DEMO_RULES);
      return;
    }
    const offlineMode = await getOfflineMode();
    if (offlineMode) {
      const cached = await getCachedRules();
      setRules(cached as RoutingRule[]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('routing_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false });
      if (error) throw error;
      const fetched = (data ?? []) as RoutingRule[];
      setRules(fetched);
      await setCachedRules(fetched);
      setIsOffline(false);
    } catch (err) {
      console.warn('[Routing] refreshRules failed, using cache', err);
      const cached = await getCachedRules();
      setRules(cached as RoutingRule[]);
      setIsOffline(true);
    }
  }, [user]);

  const refreshApps = useCallback(async () => {
    console.log('[Routing] refreshApps', { userId: user?.id });
    if (!user) {
      setApps(DEMO_APPS);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('installed_apps')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      const fetched = (data ?? []) as InstalledApp[];
      setApps(fetched);
      await setCachedApps(fetched);
    } catch (err) {
      console.warn('[Routing] refreshApps failed, using cache', err);
      const cached = await getCachedApps();
      setApps(cached as InstalledApp[]);
    }
  }, [user]);

  const syncRules = useCallback(async () => {
    console.log('[Routing] syncRules');
    await refreshRules();
    await refreshApps();
    const now = new Date().toISOString();
    await setLastSyncedAt(now);
    setLastSyncedAtState(now);
  }, [refreshRules, refreshApps]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const cached = await getCachedRules();
      if (cached.length > 0) setRules(cached as RoutingRule[]);
      const cachedApps = await getCachedApps();
      if (cachedApps.length > 0) setApps(cachedApps as InstalledApp[]);
      const lastSync = await getLastSyncedAt();
      setLastSyncedAtState(lastSync);
      await refreshRules();
      await refreshApps();
      setLoading(false);
    }
    init();
  }, [user]);

  const resolveIntent = useCallback(
    (intentType: string, rawData: Record<string, unknown>) => {
      console.log('[Routing] resolveIntent', { intentType, rawData });
      return evaluateRules(rules, intentType, rawData);
    },
    [rules]
  );

  return (
    <RoutingContext.Provider
      value={{
        rules,
        apps,
        isOffline,
        lastSyncedAt,
        loading,
        resolveIntent,
        syncRules,
        refreshRules,
        refreshApps,
      }}
    >
      {children}
    </RoutingContext.Provider>
  );
}
