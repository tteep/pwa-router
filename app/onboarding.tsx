import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { supabase } from '@/utils/supabase';
import { setOnboardingComplete } from '@/utils/storage';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Route, Zap, LogIn, ArrowRight, ChevronRight } from 'lucide-react-native';

const STEPS = [
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
  {
    icon: <LogIn size={48} color={COLORS.accent} />,
    title: 'Sign In to Sync',
    subtitle:
      'Sign in to sync your rules across devices. Or continue as a guest to explore with demo data.',
    cta: 'Sign in',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

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
    if (step < STEPS.length - 1) {
      animateToStep(step + 1);
    }
  }, [step, animateToStep]);

  const handleComplete = useCallback(async () => {
    console.log('[Onboarding] continue as guest pressed');
    await setOnboardingComplete();
    router.replace('/(tabs)/(dashboard)');
  }, [router]);

  const handleSignIn = useCallback(async () => {
    console.log('[Onboarding] sign in/up pressed', { email, isSignUp });
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        console.log('[Onboarding] signing up with email:', email);
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        console.log('[Onboarding] sign up success');
      } else {
        console.log('[Onboarding] signing in with email:', email);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        console.log('[Onboarding] sign in success');
      }
      await setOnboardingComplete();
      router.replace('/(tabs)/(dashboard)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      console.error('[Onboarding] auth error', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, isSignUp, router]);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

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
              {currentStep.icon}
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
              {currentStep.title}
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
              {currentStep.subtitle}
            </Text>

            {/* Example card for step 2 */}
            {step === 1 && currentStep.example && (
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
                      {currentStep.example.condition}
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
                    {currentStep.example.destination}
                  </Text>
                </View>
              </View>
            )}

            {/* Auth form for step 3 */}
            {isLastStep && (
              <View style={{ gap: 12, marginBottom: 16 }}>
                {/* Sign In / Sign Up tabs */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 4,
                    marginBottom: 4,
                  }}
                >
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Onboarding] switched to Sign In tab');
                      setIsSignUp(false);
                      setError('');
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: !isSignUp ? COLORS.surface : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: !isSignUp ? COLORS.text : COLORS.textSecondary,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Sign In
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Onboarding] switched to Sign Up tab');
                      setIsSignUp(true);
                      setError('');
                    }}
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

                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (error) setError('');
                    }}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
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
                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    Password
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (error) setError('');
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry
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
                {error !== '' && (
                  <Text
                    style={{
                      color: COLORS.danger,
                      fontSize: 13,
                      fontFamily: 'SpaceGrotesk_400Regular',
                    }}
                  >
                    {error}
                  </Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Bottom actions */}
          <View style={{ gap: 10, marginTop: 24 }}>
            {isLastStep ? (
              <>
                <AnimatedPressable
                  onPress={handleSignIn}
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
                  <Text
                    style={{
                      color: loading ? COLORS.textSecondary : '#fff',
                      fontSize: 15,
                      fontWeight: '600',
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                    }}
                  >
                    {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : isSignUp ? 'Create account' : 'Sign in'}
                  </Text>
                  {!loading && <ArrowRight size={18} color="#fff" />}
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleComplete}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 14,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    Continue as guest
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
                  {currentStep.cta}
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
              {STEPS.map((_, i) => (
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
