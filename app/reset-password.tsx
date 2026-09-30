import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoComplete,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'email-address' | 'default';
  autoComplete?: 'email' | 'password' | 'new-password';
  secureTextEntry?: boolean;
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
        secureTextEntry={secureTextEntry ?? false}
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

export default function ResetPasswordScreen() {
  const router = useRouter();

  // Mode detection
  const [mode, setMode] = useState<'request' | 'recovery'>('request');
  const [modeChecked, setModeChecked] = useState(false);

  // Request mode state
  const [email, setEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Recovery mode state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // On mount: check if a recovery session is already active
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionExists = !!data.session;
      console.log('[ResetPassword] mount getSession — session exists:', sessionExists);
      if (sessionExists) {
        setMode('recovery');
      }
      setModeChecked(true);
    });

    // Also listen for PASSWORD_RECOVERY event fired after deep-link redirect
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      console.log('[ResetPassword] onAuthStateChange event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[ResetPassword] PASSWORD_RECOVERY event — switching to recovery mode');
        setMode('recovery');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // --- Request mode handler ---
  const handleSend = useCallback(async () => {
    console.log('[ResetPassword] send reset link pressed', { email: email.trim() });
    if (!email.trim()) {
      setRequestError('Please enter your email address.');
      return;
    }
    setRequestLoading(true);
    setRequestError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'gatsbyrouter://reset-password',
      });
      if (resetError) throw resetError;
      console.log('[ResetPassword] reset email sent successfully');
      setRequestSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link. Please try again.';
      console.error('[ResetPassword] reset error:', msg);
      setRequestError(msg);
    } finally {
      setRequestLoading(false);
    }
  }, [email]);

  // --- Recovery mode handler ---
  const handleUpdatePassword = useCallback(async () => {
    console.log('[ResetPassword] update password pressed');
    if (!newPassword) {
      setUpdateError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setUpdateError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setUpdateError('Passwords do not match.');
      return;
    }
    setUpdateLoading(true);
    setUpdateError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      console.log('[ResetPassword] password updated successfully');
      setUpdateSuccess(true);
      setTimeout(() => {
        console.log('[ResetPassword] navigating to tabs after password update');
        router.replace('/(tabs)');
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      console.error('[ResetPassword] update password error:', msg);
      setUpdateError(msg);
    } finally {
      setUpdateLoading(false);
    }
  }, [newPassword, confirmPassword, router]);

  const handleBack = useCallback(() => {
    console.log('[ResetPassword] back pressed');
    router.back();
  }, [router]);

  // Wait until we know which mode to show
  if (!modeChecked) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </>
    );
  }

  // ── Recovery mode ──────────────────────────────────────────────────────────
  if (mode === 'recovery') {
    const isDisabled = updateLoading || updateSuccess;
    const buttonBg = isDisabled ? COLORS.surfaceElevated : COLORS.primary;
    const buttonTextColor = isDisabled ? COLORS.textSecondary : '#fff';

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
              paddingTop: 64,
              paddingBottom: 48,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text
              style={{
                color: COLORS.text,
                fontSize: 32,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk_700Bold',
                letterSpacing: -0.6,
                lineHeight: 40,
                marginBottom: 12,
              }}
            >
              New Password
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
              Choose a strong password for your account.
            </Text>

            {/* Fields */}
            <View style={{ gap: 12, marginBottom: 16 }}>
              <Field
                label="New Password"
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setUpdateError('');
                }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                secureTextEntry
              />
              <Field
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setUpdateError('');
                }}
                placeholder="Repeat your new password"
                autoComplete="new-password"
                secureTextEntry
              />
            </View>

            {/* Success message */}
            {updateSuccess && (
              <View
                style={{
                  backgroundColor: 'rgba(63,185,80,0.12)',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(63,185,80,0.35)',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: COLORS.accent,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    lineHeight: 18,
                  }}
                >
                  Password updated! Redirecting…
                </Text>
              </View>
            )}

            {/* Error box */}
            {updateError !== '' && (
              <View
                style={{
                  backgroundColor: 'rgba(248,81,73,0.12)',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(248,81,73,0.35)',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 16,
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
                  {updateError}
                </Text>
              </View>
            )}

            {/* Update button */}
            <AnimatedPressable
              onPress={handleUpdatePassword}
              disabled={isDisabled}
              style={{
                backgroundColor: buttonBg,
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              ) : (
                <>
                  <Text
                    style={{
                      color: buttonTextColor,
                      fontSize: 15,
                      fontWeight: '600',
                      fontFamily: 'SpaceGrotesk_600SemiBold',
                    }}
                  >
                    Update Password
                  </Text>
                  {!updateSuccess && <ArrowRight size={18} color="#fff" />}
                </>
              )}
            </AnimatedPressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  }

  // ── Request mode ───────────────────────────────────────────────────────────
  const isDisabled = requestLoading || requestSuccess;
  const buttonBg = isDisabled ? COLORS.surfaceElevated : COLORS.primary;
  const buttonTextColor = isDisabled ? COLORS.textSecondary : '#fff';

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
            paddingTop: 64,
            paddingBottom: 48,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <AnimatedPressable
            onPress={handleBack}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 40,
              alignSelf: 'flex-start',
            }}
          >
            <ArrowLeft size={18} color={COLORS.textSecondary} />
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              Back
            </Text>
          </AnimatedPressable>

          {/* Title */}
          <Text
            style={{
              color: COLORS.text,
              fontSize: 32,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: -0.6,
              lineHeight: 40,
              marginBottom: 12,
            }}
          >
            Reset Password
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
            Enter your email and we'll send you a reset link.
          </Text>

          {/* Email field */}
          <View style={{ gap: 12, marginBottom: 16 }}>
            <Field
              label="Email"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setRequestError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Success message */}
          {requestSuccess && (
            <View
              style={{
                backgroundColor: 'rgba(63,185,80,0.12)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(63,185,80,0.35)',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: COLORS.accent,
                  fontSize: 13,
                  fontFamily: 'SpaceGrotesk_400Regular',
                  lineHeight: 18,
                }}
              >
                Check your email for a reset link.
              </Text>
            </View>
          )}

          {/* Error box */}
          {requestError !== '' && (
            <View
              style={{
                backgroundColor: 'rgba(248,81,73,0.12)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(248,81,73,0.35)',
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 16,
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
                {requestError}
              </Text>
            </View>
          )}

          {/* Send button */}
          <AnimatedPressable
            onPress={handleSend}
            disabled={isDisabled}
            style={{
              backgroundColor: buttonBg,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            {requestLoading ? (
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            ) : (
              <>
                <Text
                  style={{
                    color: buttonTextColor,
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  Send Reset Link
                </Text>
                {!requestSuccess && <ArrowRight size={18} color="#fff" />}
              </>
            )}
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
