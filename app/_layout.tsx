import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { RoutingProvider, useRouting } from '@/contexts/RoutingContext';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { COLORS } from '@/constants/AppColors';
import { supabase } from '@/utils/supabase';
import { executeIntent } from '@/utils/device-apps';
import { PwaApp } from '@/utils/routing-engine';
import {
  parseNativeRequest,
  validateNativeRequest,
  executeNativeCapability,
  buildCallbackUrl,
  loadTrustedOrigins,
  extractOrigin,
  isTrustedOrigin,
} from '@/utils/native-bridge';

SplashScreen.preventAutoHideAsync();

function parseIncomingUrl(url: string): { intentType: string; rawData: Record<string, unknown> } | null {
  if (!url) return null;
  try {
    // Handle gatsbyrouter:// — only native bridge requests are processed; all others are internal navigation
    if (url.startsWith('gatsbyrouter://')) {
      if (url.startsWith('gatsbyrouter://native/')) {
        return { intentType: 'native_bridge', rawData: { url } };
      }
      return null;
    }

    if (url.startsWith('mailto:')) {
      const withoutScheme = url.replace('mailto:', '');
      const [recipientPart, queryPart] = withoutScheme.split('?');
      const params = new URLSearchParams(queryPart ?? '');
      return {
        intentType: 'email',
        rawData: {
          recipient: decodeURIComponent(recipientPart ?? ''),
          subject: params.get('subject') ?? '',
          body: params.get('body') ?? '',
        },
      };
    }

    if (url.startsWith('tel:')) {
      return { intentType: 'tel', rawData: { number: url.replace('tel:', '') } };
    }

    if (url.startsWith('geo:')) {
      const withoutScheme = url.replace('geo:', '');
      const [coords, queryPart] = withoutScheme.split('?');
      const params = new URLSearchParams(queryPart ?? '');
      const q = params.get('q') ?? '';
      const [lat, lng] = coords.split(',');
      return {
        intentType: 'geo',
        rawData: { lat: lat ?? '0', lng: lng ?? '0', address: q, query: q },
      };
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return { intentType: 'browser', rawData: { url } };
    }

    return null;
  } catch (e) {
    console.warn('[IntentHandler] parseIncomingUrl error', e);
    return null;
  }
}

async function handleNativeRequest(url: string, userId: string | null): Promise<void> {
  console.log('[IntentHandler] handleNativeRequest', { url, userId: userId ?? 'guest' });

  // 1. Parse
  const req = parseNativeRequest(url);
  if (!req) {
    console.warn('[IntentHandler] malformed native bridge URL, ignoring:', url);
    return;
  }

  // 2. Validate
  const validation = validateNativeRequest(req);
  if (!validation.valid) {
    console.warn('[IntentHandler] invalid native request', { errorCode: validation.errorCode, error: validation.error });
    // Attempt to deliver error to callback if it looks like a valid HTTPS URL
    try {
      const cbTest = new URL(req.callback);
      const isLocalhost = cbTest.hostname === 'localhost' || cbTest.hostname === '127.0.0.1';
      if (cbTest.protocol === 'https:' || isLocalhost) {
        const cbUrl = buildCallbackUrl(req.callback, {
          id: req.id,
          success: false,
          errorCode: validation.errorCode,
          error: validation.error,
        });
        console.log('[IntentHandler] opening error callback:', cbUrl);
        await Linking.openURL(cbUrl);
      }
    } catch {
      // Callback URL is invalid — silently drop
    }
    return;
  }

  // 3. Load trusted origins
  const trustedOrigins = userId ? await loadTrustedOrigins(userId) : [];
  const callbackOrigin = extractOrigin(req.callback);

  // 4. Trust check — silently drop if not trusted (do not disclose details to untrusted callers)
  if (!isTrustedOrigin(callbackOrigin, trustedOrigins)) {
    console.warn('[IntentHandler] untrusted callback origin, dropping request silently:', callbackOrigin);
    return;
  }

  // 5. Execute capability
  console.log('[IntentHandler] executing native capability:', req.capability);
  const response = await executeNativeCapability(req);
  console.log('[IntentHandler] native capability result', { id: response.id, success: response.success });

  // 6. Deliver result via callback URL
  const cbUrl = buildCallbackUrl(req.callback, response);
  console.log('[IntentHandler] opening result callback:', cbUrl);
  try {
    await Linking.openURL(cbUrl);
  } catch (err) {
    console.warn('[IntentHandler] failed to open callback URL:', err);
  }
}

function IntentHandler() {
  const routing = useRouting();
  const { user } = useAuth();
  const pendingUrl = useRef<string | null>(null);

  const handleUrl = React.useCallback(
    async (url: string) => {
      console.log('[IntentHandler] handleUrl', url);
      if (!url) return;

      if (routing.loading) {
        console.log('[IntentHandler] rules still loading, storing pending URL');
        pendingUrl.current = url;
        return;
      }

      const parsed = parseIncomingUrl(url);
      if (!parsed) {
        console.log('[IntentHandler] URL not handled (internal or unrecognised):', url);
        return;
      }

      const { intentType, rawData } = parsed;
      console.log('[IntentHandler] parsed intent', { intentType, rawData });

      // Native bridge request from external PWA
      if (intentType === 'native_bridge') {
        await handleNativeRequest(String(rawData.url ?? ''), user?.id ?? null);
        return;
      }

      const rule = routing.resolveIntent(intentType, rawData);
      console.log('[IntentHandler] resolved rule', rule?.name ?? null);

      let pwaApps: PwaApp[] = [];
      if (user) {
        try {
          const { data, error } = await supabase
            .from('pwa_apps')
            .select('*')
            .eq('user_id', user.id);
          if (error) {
            console.warn('[IntentHandler] failed to fetch pwa_apps', error.message);
          } else {
            pwaApps = (data ?? []) as PwaApp[];
            console.log('[IntentHandler] fetched pwa_apps count:', pwaApps.length);
          }
        } catch (err) {
          console.warn('[IntentHandler] pwa_apps fetch exception', err);
        }
      } else {
        console.log('[IntentHandler] guest user — skipping pwa_apps fetch');
      }

      const result = await executeIntent(intentType, rawData, rule, pwaApps, user?.id ?? null);
      console.log('[IntentHandler] executeIntent result', result);
    },
    [routing, user]
  );

  // Flush pending URL once rules finish loading
  useEffect(() => {
    if (!routing.loading && pendingUrl.current) {
      const url = pendingUrl.current;
      pendingUrl.current = null;
      console.log('[IntentHandler] flushing pending URL after rules loaded:', url);
      handleUrl(url);
    }
  }, [routing.loading, handleUrl]);

  // Cold-start: catch the URL that launched the app
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      console.log('[IntentHandler] getInitialURL:', url);
      if (url) handleUrl(url);
    });

    // Foreground: subscribe to incoming URLs while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[IntentHandler] Linking event url:', url);
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [handleUrl]);

  return null;
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const CustomDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    primary: '#58A6FF',
    background: '#0D1117',
    card: '#161B22',
    text: '#E6EDF3',
    border: 'rgba(240,246,252,0.1)',
    notification: '#F85149',
  },
};

const CustomDefaultTheme: Theme = {
  ...DefaultTheme,
  colors: {
    primary: '#58A6FF',
    background: '#0D1117',
    card: '#161B22',
    text: '#E6EDF3',
    border: 'rgba(240,246,252,0.1)',
    notification: '#F85149',
  },
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Don't redirect until the initial session check has completed
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';

    console.log('[AuthGuard] session:', !!session, 'segments:', segments, 'isLoading:', isLoading);

    if (!session && !inOnboarding) {
      // No session (not even anonymous) → send to onboarding
      console.log('[AuthGuard] no session → redirect to onboarding');
      router.replace('/onboarding');
    } else if (session && inOnboarding) {
      // Already authenticated (including anonymous) → skip onboarding
      console.log('[AuthGuard] session exists on onboarding → redirect to tabs');
      router.replace('/(tabs)/(dashboard)');
    }
  }, [session, isLoading, segments]);

  // Show spinner while the initial getSession() is in flight
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <RoutingProvider>
              <IntentHandler />
              {Platform.OS === 'ios' ? (
                <WidgetProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <AuthGuard>
                      <Stack
                        screenOptions={{
                          headerStyle: { backgroundColor: '#161B22' },
                          headerTintColor: '#E6EDF3',
                          headerTitleStyle: {
                            fontFamily: 'SpaceGrotesk_600SemiBold',
                            fontSize: 17,
                          },
                          contentStyle: { backgroundColor: '#0D1117' },
                        }}
                      >
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                        <Stack.Screen
                          name="test-intent"
                          options={{
                            title: 'Simulate Intent',
                            presentation: 'modal',
                            headerStyle: { backgroundColor: '#161B22' },
                            headerTintColor: '#E6EDF3',
                          }}
                        />
                        <Stack.Screen
                          name="rule/[id]"
                          options={{
                            title: 'Rule',
                            headerStyle: { backgroundColor: '#161B22' },
                            headerTintColor: '#E6EDF3',
                          }}
                        />
                        <Stack.Screen
                          name="intent/[id]"
                          options={{
                            title: 'Intent Detail',
                            headerStyle: { backgroundColor: '#161B22' },
                            headerTintColor: '#E6EDF3',
                          }}
                        />
                      </Stack>
                    </AuthGuard>
                    <SystemBars style="light" />
                  </GestureHandlerRootView>
                </WidgetProvider>
              ) : (
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AuthGuard>
                    <Stack
                      screenOptions={{
                        headerStyle: { backgroundColor: '#161B22' },
                        headerTintColor: '#E6EDF3',
                        headerTitleStyle: {
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          fontSize: 17,
                        },
                        contentStyle: { backgroundColor: '#0D1117' },
                      }}
                    >
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                      <Stack.Screen
                        name="test-intent"
                        options={{
                          title: 'Simulate Intent',
                          presentation: 'modal',
                          headerStyle: { backgroundColor: '#161B22' },
                          headerTintColor: '#E6EDF3',
                        }}
                      />
                      <Stack.Screen
                        name="rule/[id]"
                        options={{
                          title: 'Rule',
                          headerStyle: { backgroundColor: '#161B22' },
                          headerTintColor: '#E6EDF3',
                        }}
                      />
                      <Stack.Screen
                        name="intent/[id]"
                        options={{
                          title: 'Intent Detail',
                          headerStyle: { backgroundColor: '#161B22' },
                          headerTintColor: '#E6EDF3',
                        }}
                      />
                    </Stack>
                  </AuthGuard>
                  <SystemBars style="light" />
                </GestureHandlerRootView>
              )}
            </RoutingProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
