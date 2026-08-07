import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Animated,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS, INTENT_COLORS } from '@/constants/AppColors';
import { useRouting } from '@/contexts/RoutingContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { INTENT_META } from '@/utils/intent-parser';
import { buildLaunchUrl } from '@/utils/intent-parser';
import { RoutingRule } from '@/utils/routing-engine';
import {
  Mail,
  Phone,
  MapPin,
  FileText,
  Image as ImageIcon,
  Type,
  Globe,
  Users,
  Zap,
  ChevronRight,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react-native';

const INTENT_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={24} color={INTENT_COLORS.email} />,
  tel: <Phone size={24} color={INTENT_COLORS.tel} />,
  geo: <MapPin size={24} color={INTENT_COLORS.geo} />,
  pdf: <FileText size={24} color={INTENT_COLORS.pdf} />,
  image: <ImageIcon size={24} color={INTENT_COLORS.image} />,
  text: <Type size={24} color={INTENT_COLORS.text} />,
  browser: <Globe size={24} color={INTENT_COLORS.browser} />,
  contacts: <Users size={24} color={INTENT_COLORS.contacts} />,
  custom: <Zap size={24} color={INTENT_COLORS.custom} />,
};

const INTENT_FIELDS: Record<string, { key: string; label: string; placeholder: string; mono?: boolean }[]> = {
  email: [
    { key: 'recipient', label: 'Recipient', placeholder: 'e.g. boss@company.com' },
    { key: 'subject', label: 'Subject', placeholder: 'e.g. Q4 Report' },
    { key: 'body', label: 'Body', placeholder: 'Email body...' },
  ],
  tel: [
    { key: 'phone_number', label: 'Phone number', placeholder: 'e.g. +1 555 123 4567' },
  ],
  geo: [
    { key: 'address', label: 'Address', placeholder: 'e.g. 1600 Amphitheatre Pkwy' },
    { key: 'lat', label: 'Latitude', placeholder: 'e.g. 37.4220' },
    { key: 'lng', label: 'Longitude', placeholder: 'e.g. -122.0841' },
  ],
  pdf: [
    { key: 'filename', label: 'Filename', placeholder: 'e.g. report.pdf' },
    { key: 'file_size_mb', label: 'File size (MB)', placeholder: 'e.g. 2.4' },
  ],
  image: [
    { key: 'filename', label: 'Filename', placeholder: 'e.g. photo.jpg' },
    { key: 'mime_type', label: 'MIME type', placeholder: 'e.g. image/jpeg' },
  ],
  text: [
    { key: 'content', label: 'Content', placeholder: 'Text content...' },
  ],
  browser: [
    { key: 'url', label: 'URL', placeholder: 'e.g. https://github.com', mono: true },
  ],
  contacts: [
    { key: 'name', label: 'Name', placeholder: 'e.g. John Doe' },
    { key: 'phone', label: 'Phone', placeholder: 'e.g. +1 555 000 0000' },
  ],
  custom: [
    { key: 'mime_type', label: 'MIME type', placeholder: 'e.g. application/x-custom' },
    { key: 'data', label: 'Data', placeholder: 'Custom data...' },
  ],
};

type Step = 'type' | 'data' | 'result';

export default function TestIntentScreen() {
  const router = useRouter();
  const { resolveIntent } = useRouting();

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<string>('email');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [matchedRule, setMatchedRule] = useState<RoutingRule | null>(null);
  const [resolving, setResolving] = useState(false);

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.9)).current;

  const handleTypeSelect = useCallback((type: string) => {
    console.log('[TestIntent] type selected:', type);
    setSelectedType(type);
    setFormData({});
    setStep('data');
  }, []);

  const handleResolve = useCallback(async () => {
    console.log('[TestIntent] resolve pressed', { selectedType, formData });
    setResolving(true);
    const rawData: Record<string, unknown> = {};
    Object.entries(formData).forEach(([k, v]) => {
      rawData[k] = v;
    });
    const rule = resolveIntent(selectedType, rawData);
    setMatchedRule(rule);
    setStep('result');
    setResolving(false);

    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
    ]).start();
  }, [selectedType, formData, resolveIntent, resultOpacity, resultScale]);

  const handleLaunch = useCallback(async () => {
    console.log('[TestIntent] launch app pressed', { selectedType, formData });
    const rawData: Record<string, unknown> = {};
    Object.entries(formData).forEach(([k, v]) => { rawData[k] = v; });
    const url = buildLaunchUrl(selectedType, rawData);
    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          console.warn('[TestIntent] cannot open URL:', url);
        }
      } catch (err) {
        console.error('[TestIntent] launch error', err);
      }
    }
  }, [selectedType, formData]);

  const handleBack = useCallback(() => {
    console.log('[TestIntent] back pressed, step:', step);
    if (step === 'data') setStep('type');
    else if (step === 'result') {
      setStep('data');
      resultOpacity.setValue(0);
      resultScale.setValue(0.9);
    }
  }, [step, resultOpacity, resultScale]);

  const intentTypes = Object.keys(INTENT_META);
  const fields = INTENT_FIELDS[selectedType] ?? [];
  const meta = INTENT_META[selectedType];
  const color = INTENT_COLORS[selectedType] ?? COLORS.primary;

  const stepLabels: Record<Step, string> = {
    type: 'Choose type',
    data: 'Fill data',
    result: 'Result',
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Simulate Intent' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        {/* Step indicator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          {(['type', 'data', 'result'] as Step[]).map((s, i) => {
            const isActive = step === s;
            const isDone = (step === 'data' && s === 'type') || (step === 'result' && s !== 'result');
            return (
              <React.Fragment key={s}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    backgroundColor: isActive ? COLORS.primary : isDone ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#fff' : isDone ? COLORS.primary : COLORS.textTertiary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    {i + 1}. {stepLabels[s]}
                  </Text>
                </View>
                {i < 2 && <ChevronRight size={14} color={COLORS.textTertiary} />}
              </React.Fragment>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Choose type */}
          {step === 'type' && (
            <View>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 20,
                  fontWeight: '700',
                  fontFamily: 'SpaceGrotesk_700Bold',
                  marginBottom: 4,
                }}
              >
                Choose intent type
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 13,
                  fontFamily: 'SpaceGrotesk_400Regular',
                  marginBottom: 20,
                }}
              >
                Select the type of intent to simulate
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {intentTypes.map((type) => {
                  const typeMeta = INTENT_META[type];
                  const typeColor = INTENT_COLORS[type] ?? COLORS.primary;
                  return (
                    <AnimatedPressable
                      key={type}
                      onPress={() => handleTypeSelect(type)}
                      style={{
                        width: '30%',
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        padding: 14,
                        alignItems: 'center',
                        gap: 8,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: `${typeColor}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {INTENT_ICONS[type]}
                      </View>
                      <Text
                        style={{
                          color: COLORS.text,
                          fontSize: 12,
                          fontFamily: 'SpaceGrotesk_500Medium',
                          textAlign: 'center',
                        }}
                      >
                        {typeMeta.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 2: Fill data */}
          {step === 'data' && (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <AnimatedPressable onPress={handleBack}>
                  <ArrowLeft size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${color}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {INTENT_ICONS[selectedType]}
                </View>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 18,
                    fontWeight: '700',
                    fontFamily: 'SpaceGrotesk_700Bold',
                  }}
                >
                  {meta?.label} Intent
                </Text>
              </View>

              {fields.map((field) => (
                <View key={field.key} style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk_500Medium',
                    }}
                  >
                    {field.label}
                  </Text>
                  <TextInput
                    value={formData[field.key] ?? ''}
                    onChangeText={(v) => {
                      setFormData((prev) => ({ ...prev, [field.key]: v }));
                    }}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="none"
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: COLORS.text,
                      fontSize: 14,
                      fontFamily: field.mono ? 'SpaceMono' : 'SpaceGrotesk_400Regular',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  />
                </View>
              ))}

              <AnimatedPressable
                onPress={handleResolve}
                disabled={resolving}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 8,
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
                  {resolving ? 'Resolving...' : 'Resolve intent'}
                </Text>
                <ChevronRight size={18} color="#fff" />
              </AnimatedPressable>
            </View>
          )}

          {/* Step 3: Result */}
          {step === 'result' && (
            <Animated.View
              style={{
                opacity: resultOpacity,
                transform: [{ scale: resultScale }],
                gap: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <AnimatedPressable onPress={handleBack}>
                  <ArrowLeft size={20} color={COLORS.textSecondary} />
                </AnimatedPressable>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 18,
                    fontWeight: '700',
                    fontFamily: 'SpaceGrotesk_700Bold',
                  }}
                >
                  Routing Result
                </Text>
              </View>

              {matchedRule ? (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent}40`,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={24} color={COLORS.accent} />
                    <Text
                      style={{
                        color: COLORS.accent,
                        fontSize: 16,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Rule matched
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      padding: 14,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>Rule</Text>
                      <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' }} numberOfLines={1}>
                        {matchedRule.name}
                      </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>Destination</Text>
                      <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' }}>
                        {matchedRule.dest_display_name}
                      </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>Package</Text>
                      <Text
                        style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceMono' }}
                        numberOfLines={1}
                      >
                        {matchedRule.dest_package}
                      </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>Priority</Text>
                      <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' }}>
                        {matchedRule.priority}
                      </Text>
                    </View>
                  </View>

                  <AnimatedPressable
                    onPress={handleLaunch}
                    style={{
                      backgroundColor: COLORS.accent,
                      borderRadius: 12,
                      paddingVertical: 13,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <ExternalLink size={16} color="#fff" />
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Launch app
                    </Text>
                  </AnimatedPressable>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: `${COLORS.warning}40`,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <XCircle size={24} color={COLORS.warning} />
                    <Text
                      style={{
                        color: COLORS.warning,
                        fontSize: 16,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      No rule matched
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 13,
                      fontFamily: 'SpaceGrotesk_400Regular',
                      lineHeight: 19,
                    }}
                  >
                    No active routing rule matched this intent. Create a rule for{' '}
                    <Text style={{ color: COLORS.text }}>{INTENT_META[selectedType]?.label}</Text> intents to route them automatically.
                  </Text>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[TestIntent] create rule from result pressed');
                      router.push('/rule/new');
                    }}
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 12,
                      paddingVertical: 13,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.primary,
                        fontSize: 14,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Create a rule
                    </Text>
                  </AnimatedPressable>
                </View>
              )}

              <AnimatedPressable
                onPress={() => {
                  console.log('[TestIntent] try another intent pressed');
                  setStep('type');
                  setFormData({});
                  resultOpacity.setValue(0);
                  resultScale.setValue(0.9);
                }}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingVertical: 13,
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
                  Try another intent
                </Text>
              </AnimatedPressable>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
