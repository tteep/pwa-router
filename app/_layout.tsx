import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
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
import { RoutingProvider } from '@/contexts/RoutingContext';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { COLORS } from '@/constants/AppColors';

SplashScreen.preventAutoHideAsync();

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
