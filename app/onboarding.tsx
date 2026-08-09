import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { supabase } from '@/utils/supabase';
import { setOnboardingComplete } from '@/utils/storage';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Route, Zap, LogIn, ArrowRight, ChevronRight } from 'lucide-react-native';

// ─── Onboarding intro steps (steps 0 and 1) ──────────────────────────────────

const INTRO_STEPS = [
  {
    icon: <Route size={48} color={COLORS.primary} />,
    title: 'Welcome to\nGatsby Router',
    subtitle:
      'The intelligent intent dispatcher for Android and iOS. Automatically route emails, maps, PDFs, and more to the right app — every time.',
    cta: 'Get started',
  },
  {
    icon: <Zap size={48} color={COLORS.warning} />,
    title: 'Set Up Your Rules',
    subtitle:
      'Create routing rules to control which app handles each intent. For example: send work emails to Outlook and personal emails to Gmail — automatically.',
    cta: 'Continue',
    example: {
      condition: 'recipient contains @company.com',
      destination: '→ Outlook',
    },
  },
];

// ─── Input field helper ───────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoComplete?: 'email' | 'password' | 'new-password';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 12,
          fontFamily: 'SpaceGrotesk_500Medium',
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoComplete={autoComplete}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: COLORS.text,
          fontSize: 15,
          fontFamily: 'SpaceGrotesk_400Regular',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();

  // Intro step (0 = welcome, 1 = rules explainer, 2 = auth)
  const [step, setStep] = useState(0);

  // Auth tab
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const clearError = useCallback(() => setError(''), []);

  const animateToStep = useCallback(
    (nextStep: number) => {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      setStep(nextStep);
    },
    [slideAnim]
  );

  const handleNext = useCallback(() => {
    console.log('[Onboarding] next pressed, step:', step);
    if (step < 2) {
      animateToStep(step + 1);
    }
  }, [step, animateToStep]);

  const handleTabSwitch = useCallback((tab: 'signin' | 'signup') => {
    console.log('[Onboarding] tab switched to:', tab);
    setActiveTab(tab);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, []);

  // ── Sign In ────────────────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    console.log('[Onboarding] sign in pressed', { email });
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      console.log('[Onboarding] sign in success');
      await setOnboardingComplete();
      router.replace('/(tabs)/(dashboard)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      console.error('[Onboarding] sign in error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  // ── Sign Up ────────────────────────────────────────────────────────────────

  const handleSignUp = useCallback(async () => {
    console.log('[Onboarding] sign up pressed', { email });
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      console.log('[Onboarding] sign up success');
      await setOnboardingComplete();
      router.replace('/(tabs)/(dashboard)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      console.error('[Onboarding] sign up error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, router]);

  // ── Continue as Guest (anonymous auth with fallbacks) ─────────────────────

  const handleGuest = useCallback(async () => {
    console.log('[Onboarding] continue as guest pressed');
    setLoading(true);
    setError('');
    try {
      // Step 1: Try anonymous sign-in
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError) {
        console.log('[Onboarding] anonymous sign in success');
        await setOnboardingComplete();
        router.replace('/(tabs)/(dashboard)');
        return;
      }

      console.warn('[Onboarding] anonymous sign in error:', anonError.message);

      // Step 2: If anonymous sign-ins are disabled, use guest-session edge function
      if (anonError.message.toLowerCase().includes('anonymous sign-ins are disabled') ||
          anonError.message.toLowerCase().includes('anonymous') ||
          anonError.status === 422) {
        console.log('[Onboarding] falling back to guest-session edge function');

        // Get or create a stable device ID
        const { default: SecureStore } = await import('expo-secure-store');
        let deviceId = await SecureStore.getItemAsync('gatsby_device_id');
        if (!deviceId) {
          deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          await SecureStore.setItemAsync('gatsby_device_id', deviceId);
          console.log('[Onboarding] generated new device ID:', deviceId);
        } else {
          console.log('[Onboarding] using existing device ID:', deviceId);
        }

        console.log('[Onboarding] calling guest-session edge function');
        const response = await fetch(
          'https://eomrynglzkjeygguvtyw.supabase.co/functions/v1/guest-session',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.warn('[Onboarding] guest-session edge function error:', response.status, text);
          throw new Error(`Guest session failed: ${response.status}`);
        }

        const { email: guestEmail, password: guestPassword } = await response.json();
        console.log('[Onboarding] guest-session returned credentials, signing in');

        const { error: pwError } = await supabase.auth.signInWithPassword({
          email: guestEmail,
          password: guestPassword,
        });
        if (pwError) throw pwError;

        console.log('[Onboarding] guest password sign in success');
        await setOnboardingComplete();
        router.replace('/(tabs)/(dashboard)');
        return;
      }

      throw anonError;
    } catch (err: unknown) {
      console.warn('[Onboarding] all auth methods failed, entering demo mode');
      // Step 3: Final fallback — skip auth entirely, enter demo/guest mode
      try {
        await setOnboardingComplete();
        router.replace('/(tabs)/(dashboard)');
      } catch (navErr) {
        const msg = err instanceof Error ? err.message : 'Could not continue as guest. Please try again.';
        console.error('[Onboarding] guest fallback error:', msg);
        setError(msg);
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const isAuthStep = step === 2;
  const isSignIn = activeTab === 'signin';
  const isSignUp = activeTab === 'signup';
  const currentIntroStep = INTRO_STEPS[step];

  const signInButtonLabel = loading && isSignIn ? 'Signing in…' : 'Sign In';
  const signUpButtonLabel = loading && isSignUp ? 'Creating account…' : 'Sign Up';
  const guestButtonLabel = loading && !isSignIn && !isSignUp ? 'Continuing…' : 'Continue as Guest';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 80,
            paddingBottom: 48,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              flex: 1,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {/* ── Intro steps (0 & 1) ── */}
            {!isAuthStep && currentIntroStep && (
              <>
                {/* Icon */}
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 24,
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 32,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {currentIntroStep.icon}
                </View>

                {/* Title */}
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 32,
                    fontWeight: '700',
                    fontFamily: 'SpaceGrotesk_700Bold',
                    letterSpacing: -0.6,
                    lineHeight: 40,
                    marginBottom: 16,
                  }}
                >
                  {currentIntroStep.title}
                </Text>

                {/* Subtitle */}
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 16,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    lineHeight: 24,
                    marginBottom: 32,
                  }}
                >
                  {currentIntroStep.subtitle}
                </Text>

                {/* Example card for step 1 */}
                {step === 1 && currentIntroStep.example && (
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      marginBottom: 32,
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 11,
                        fontFamily: 'SpaceGrotesk_500Medium',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                      }}
                    >
                      Example rule
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          backgroundColor: COLORS.primaryMuted,
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.primary,
                            fontSize: 12,
                            fontFamily: 'SpaceMono',
                          }}
                        >
                          {currentIntroStep.example.condition}
                        </Text>
                      </View>
                      <ChevronRight size={14} color={COLORS.textTertiary} />
                      <Text
                        style={{
                          color: COLORS.accent,
                          fontSize: 13,
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                        }}
                      >
                        {currentIntroStep.example.destination}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* ── Auth step (2) ── */}
            {isAuthStep && (
              <>
                {/* Header */}
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 24,
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 32,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <LogIn size={48} color={COLORS.accent} />
                </View>

                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 32,
                    fontWeight: '700',
                    fontFamily: 'SpaceGrotesk_700Bold',
                    letterSpacing: -0.6,
                    lineHeight: 40,
                    marginBottom: 16,
                  }}
                >
                  Sign In to Sync
                </Text>

                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 16,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    lineHeight: 24,
                    marginBottom: 28,
                  }}
                >
                  Sign in to sync your rules across devices. Or continue as a guest to explore with demo data.
                </Text>

                {/* Tab switcher */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 4,
                    marginBottom: 16,
                  }}
                >
                  <AnimatedPressable
                    onPress={() => handleTabSwitch('signin')}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: isSignIn ? COLORS.surface : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: isSignIn ? COLORS.text : COLORS.textSecondary,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Sign In
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => handleTabSwitch('signup')}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: isSignUp ? COLORS.surface : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: isSignUp ? COLORS.text : COLORS.textSecondary,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Sign Up
                    </Text>
                  </AnimatedPressable>
                </View>

                {/* Form fields */}
                <View style={{ gap: 12, marginBottom: 16 }}>
                  <Field
                    label="Email"
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError(); }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  <Field
                    label="Password"
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError(); }}
                    placeholder="••••••••"
                    secureTextEntry
                    autoComplete={isSignUp ? 'new-password' : 'password'}
                  />
                  {isSignUp && (
                    <Field
                      label="Confirm Password"
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                    />
                  )}
                </View>

                {/* Error box */}
                {error !== '' && (
                  <View
                    style={{
                      backgroundColor: 'rgba(248,81,73,0.12)',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(248,81,73,0.35)',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.danger,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_400Regular',
                        lineHeight: 18,
                      }}
                    >
                      {error}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Animated.View>

          {/* ── Bottom actions ── */}
          <View style={{ gap: 10, marginTop: 24 }}>
            {isAuthStep ? (
              <>
                {/* Primary auth button */}
                <AnimatedPressable
                  onPress={isSignIn ? handleSignIn : handleSignUp}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? COLORS.surfaceElevated : COLORS.primary,
                    borderRadius: 12,
                    paddingVertical: 15,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.textSecondary} />
                  ) : (
                    <>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 15,
                          fontWeight: '600',
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                        }}
                      >
                        {isSignIn ? signInButtonLabel : signUpButtonLabel}
                      </Text>
                      <ArrowRight size={18} color="#fff" />
                    </>
                  )}
                </AnimatedPressable>

                {/* Guest button */}
                <AnimatedPressable
                  onPress={handleGuest}
                  disabled={loading}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: loading ? COLORS.textTertiary : COLORS.textSecondary,
                      fontSize: 14,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    {guestButtonLabel}
                  </Text>
                </AnimatedPressable>
              </>
            ) : (
              <AnimatedPressable
                onPress={handleNext}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  {currentIntroStep?.cta ?? 'Continue'}
                </Text>
                <ArrowRight size={18} color="#fff" />
              </AnimatedPressable>
            )}

            {/* Progress dots */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
                marginTop: 8,
              }}
            >
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: i === step ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === step ? COLORS.primary : COLORS.surfaceElevated,
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
