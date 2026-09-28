import React, { useCallback, useState } from 'react';
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
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

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = useCallback(async () => {
    console.log('[ResetPassword] send reset link pressed', { email: email.trim() });
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      console.log('[ResetPassword] reset email sent successfully');
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link. Please try again.';
      console.error('[ResetPassword] reset error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleBack = useCallback(() => {
    console.log('[ResetPassword] back pressed');
    router.back();
  }, [router]);

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
                setError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Success message */}
          {success && (
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
          {error !== '' && (
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
                {error}
              </Text>
            </View>
          )}

          {/* Send button */}
          <AnimatedPressable
            onPress={handleSend}
            disabled={loading || success}
            style={{
              backgroundColor: loading || success ? COLORS.surfaceElevated : COLORS.primary,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            ) : (
              <>
                <Text
                  style={{
                    color: success ? COLORS.textSecondary : '#fff',
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'SpaceGrotesk_600SemiBold',
                  }}
                >
                  Send Reset Link
                </Text>
                {!success && <ArrowRight size={18} color="#fff" />}
              </>
            )}
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
