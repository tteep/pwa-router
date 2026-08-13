import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS, INTENT_COLORS } from '@/constants/AppColors';
import { useRouting } from '@/contexts/RoutingContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { INTENT_META } from '@/utils/intent-parser';
import { RoutingRule } from '@/utils/routing-engine';
import { executeIntent, ExecuteIntentResult } from '@/utils/device-apps';
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
  Wifi,
  WifiOff,
} from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

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
    { key: 'recipient', label: 'To (recipient)', placeholder: 'e.g. boss@company.com' },
    { key: 'subject', label: 'Subject', placeholder: 'e.g. Q4 Report' },
    { key: 'body', label: 'Body', placeholder: 'Email body...' },
  ],
  tel: [
    { key: 'phone_number', label: 'Phone number', placeholder: 'e.g. +1 555 123 4567' },
  ],
  geo: [
    { key: 'address', label: 'Address or query', placeholder: 'e.g. 1600 Amphitheatre Pkwy' },
    { key: 'lat', label: 'Latitude (optional)', placeholder: 'e.g. 37.4220' },
    { key: 'lng', label: 'Longitude (optional)', placeholder: 'e.g. -122.0841' },
  ],
  pdf: [
    { key: 'filename', label: 'Filename', placeholder: 'e.g. report.pdf' },
    { key: 'url', label: 'File URL', placeholder: 'https://...', mono: true },
  ],
  image: [
    { key: 'filename', label: 'Filename', placeholder: 'e.g. photo.jpg' },
    { key: 'url', label: 'File URL', placeholder: 'https://...', mono: true },
  ],
  text: [
    { key: 'phone_number', label: 'Phone number', placeholder: 'e.g. +1 555 123 4567' },
    { key: 'content', label: 'Message body', placeholder: 'Message...' },
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TestIntentScreen() {
  const router = useRouter();
  const { resolveIntent, rules } = useRouting();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<string>('email');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [matchedRule, setMatchedRule] = useState<RoutingRule | null>(null);
  const [execResult, setExecResult] = useState<ExecuteIntentResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [pwaApps, setPwaApps] = useState<{
    id: string;
    user_id: string;
    name: string;
    url: string;
    icon_url: string | null;
    description: string | null;
    intent_types: string[];
    package_name: string;
    is_active: boolean;
    created_at: string;
  }[]>([]);

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.9)).current;

  // Load active PWA apps for routing
  useEffect(() => {
    if (!user) return;
    console.log('[TestIntent] loading pwa_apps for routing');
    supabase
      .from('pwa_apps')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) {
          console.error('[TestIntent] pwa_apps load error:', error);
          return;
        }
        console.log('[TestIntent] loaded', data?.length ?? 0, 'pwa apps for routing');
        setPwaApps(data ?? []);
      });
  }, [user]);

  const handleTypeSelect = useCallback((type: string) => {
    console.log('[TestIntent] intent type selected:', type);
    setSelectedType(type);
    setFormData({});
    setStep('data');
  }, []);

  const handleRoute = useCallback(async () => {
    console.log('[TestIntent] Route Intent pressed', { selectedType, formData });
    setResolving(true);

    const rawData: Record<string, unknown> = {};
    Object.entries(formData).forEach(([k, v]) => { rawData[k] = v; });

    // Step 1: resolve rule
    const rule = resolveIntent(selectedType, rawData);
    console.log('[TestIntent] resolved rule:', rule?.name ?? 'none');
    setMatchedRule(rule);

    // Step 2: execute intent (open URL)
    const result = await executeIntent(selectedType, rawData, rule, pwaApps, user?.id ?? null);
    console.log('[TestIntent] executeIntent result:', result);
    setExecResult(result);

    // Step 3: save to intent_history if logged in
    if (user) {
      console.log('[TestIntent] saving to intent_history for user:', user.id);
      const { error: histError } = await supabase.from('intent_history').insert({
        user_id: user.id,
        intent_type: selectedType,
        raw_data: rawData,
        matched_rule_id: rule?.id ?? null,
        destination: result.destination,
        is_pwa: result.isPwa,
        final_url: result.finalUrl,
      });
      if (histError) {
        console.warn('[TestIntent] intent_history insert error:', histError.message);
      } else {
        console.log('[TestIntent] intent_history saved');
      }
    }

    setStep('result');
    setResolving(false);

    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
    ]).start();
  }, [selectedType, formData, resolveIntent, pwaApps, user, resultOpacity, resultScale]);

  const handleBack = useCallback(() => {
    console.log('[TestIntent] back pressed, step:', step);
    if (step === 'data') setStep('type');
    else if (step === 'result') {
      setStep('data');
      resultOpacity.setValue(0);
      resultScale.setValue(0.9);
    }
  }, [step, resultOpacity, resultScale]);

  const handleTryAnother = useCallback(() => {
    console.log('[TestIntent] try another intent pressed');
    setStep('type');
    setFormData({});
    setExecResult(null);
    setMatchedRule(null);
    resultOpacity.setValue(0);
    resultScale.setValue(0.9);
  }, [resultOpacity, resultScale]);

  const intentTypes = Object.keys(INTENT_META);
  const fields = INTENT_FIELDS[selectedType] ?? [];
  const meta = INTENT_META[selectedType];
  const color = INTENT_COLORS[selectedType] ?? COLORS.primary;

  const stepLabels: Record<Step, string> = {
    type: 'Choose type',
    data: 'Fill data',
    result: 'Result',
  };

  // Derived display values for result card
  const resultIsPwa = execResult?.isPwa ?? false;
  const resultDestination = execResult?.destination ?? '';
  const resultFinalUrl = execResult?.finalUrl ?? '';
  const resultColor = resultIsPwa ? COLORS.accent : COLORS.primary;
  const resultLabel = resultIsPwa ? 'Routed to PWA' : 'Routed to native';
  const resultBadgeText = resultIsPwa ? 'PWA' : 'NATIVE';

  return (
    <>
      <Stack.Screen options={{ title: 'Test Intent Routing' }} />
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
            const bgColor = isActive ? COLORS.primary : isDone ? COLORS.primaryMuted : COLORS.surfaceSecondary;
            const textColor = isActive ? '#fff' : isDone ? COLORS.primary : COLORS.textTertiary;
            return (
              <React.Fragment key={s}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    backgroundColor: bgColor,
                  }}
                >
                  <Text
                    style={{
                      color: textColor,
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
          {/* ── Step 1: Choose type ── */}
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
                Select the type of intent to simulate and route
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

              {/* Rules count hint */}
              <View
                style={{
                  marginTop: 20,
                  backgroundColor: `${COLORS.primary}10`,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary}25`,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Wifi size={13} color={COLORS.primary} />
                <Text
                  style={{
                    flex: 1,
                    color: COLORS.primary,
                    fontSize: 12,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    lineHeight: 17,
                  }}
                >
                  {rules.length}
                  {' '}
                  active routing rule
                  {rules.length !== 1 ? 's' : ''}
                  {' '}
                  loaded
                  {pwaApps.length > 0 ? ` · ${pwaApps.length} PWA${pwaApps.length !== 1 ? 's' : ''} available` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* ── Step 2: Fill data ── */}
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
                  {meta?.label}
                  {' '}
                  Intent
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
                onPress={handleRoute}
                disabled={resolving}
                style={{
                  backgroundColor: resolving ? COLORS.surfaceElevated : COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 8,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color={COLORS.textSecondary} />
                ) : (
                  <>
                    <ExternalLink size={16} color="#fff" />
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      Route Intent
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            </View>
          )}

          {/* ── Step 3: Result ── */}
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

              {/* Destination card */}
              {execResult && (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: `${resultColor}40`,
                    gap: 14,
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {resultIsPwa ? (
                      <Globe size={22} color={resultColor} />
                    ) : (
                      <CheckCircle size={22} color={resultColor} />
                    )}
                    <Text
                      style={{
                        color: resultColor,
                        fontSize: 16,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                        flex: 1,
                      }}
                    >
                      {resultLabel}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: `${resultColor}20`,
                        borderWidth: 1,
                        borderColor: `${resultColor}40`,
                      }}
                    >
                      <Text
                        style={{
                          color: resultColor,
                          fontSize: 10,
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                          letterSpacing: 0.5,
                        }}
                      >
                        {resultBadgeText}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    {/* Destination */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>
                        Destination
                      </Text>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                        {resultDestination}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />

                    {/* Rule */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>
                        Rule
                      </Text>
                      <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' }} numberOfLines={1}>
                        {matchedRule ? matchedRule.name : 'No rule (fallback)'}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />

                    {/* Final URL */}
                    <View style={{ gap: 4 }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>
                        Final URL
                      </Text>
                      <Text
                        style={{
                          color: COLORS.textTertiary,
                          fontSize: 11,
                          fontFamily: 'SpaceMono',
                          lineHeight: 16,
                        }}
                        numberOfLines={3}
                      >
                        {resultFinalUrl || '(none)'}
                      </Text>
                    </View>

                    {matchedRule && (
                      <>
                        <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }}>
                            Priority
                          </Text>
                          <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' }}>
                            {matchedRule.priority}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* History saved indicator */}
                  {user && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Wifi size={12} color={COLORS.accent} />
                      <Text
                        style={{
                          color: COLORS.accent,
                          fontSize: 11,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        }}
                      >
                        Saved to intent history
                      </Text>
                    </View>
                  )}
                  {!user && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <WifiOff size={12} color={COLORS.textTertiary} />
                      <Text
                        style={{
                          color: COLORS.textTertiary,
                          fontSize: 11,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        }}
                      >
                        Sign in to save history
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* No rule matched */}
              {!matchedRule && (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: `${COLORS.warning}30`,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <XCircle size={16} color={COLORS.warning} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        color: COLORS.warning,
                        fontSize: 13,
                        fontFamily: 'SpaceGrotesk_600SemiBold',
                      }}
                    >
                      No rule matched
                    </Text>
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 12,
                        fontFamily: 'SpaceGrotesk_400Regular',
                        lineHeight: 17,
                      }}
                    >
                      Fell back to native handler. Create a rule for
                      {' '}
                      <Text style={{ color: COLORS.text }}>{INTENT_META[selectedType]?.label}</Text>
                      {' '}
                      intents to route them to a PWA.
                    </Text>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[TestIntent] create rule pressed from result');
                        router.push('/rule/new');
                      }}
                      style={{
                        marginTop: 6,
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.primary,
                          fontSize: 12,
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                        }}
                      >
                        Create a rule
                      </Text>
                    </AnimatedPressable>
                  </View>
                </View>
              )}

              {/* Try another */}
              <AnimatedPressable
                onPress={handleTryAnother}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
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
