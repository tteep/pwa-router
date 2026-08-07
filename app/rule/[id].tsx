import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS } from '@/constants/AppColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouting } from '@/contexts/RoutingContext';
import { supabase } from '@/utils/supabase';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RoutingRule } from '@/utils/routing-engine';
import { INTENT_META } from '@/utils/intent-parser';
import { Trash2 } from 'lucide-react-native';

const INTENT_TYPES = Object.keys(INTENT_META);
const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'matches_regex', label: 'Matches regex' },
];

function FormLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text
      style={{
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_500Medium',
        marginBottom: 6,
      }}
    >
      {text}
      {required && (
        <Text style={{ color: COLORS.danger }}> *</Text>
      )}
    </Text>
  );
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  mono,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textTertiary}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      keyboardType={keyboardType}
      autoCapitalize="none"
      style={{
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: COLORS.text,
        fontSize: 14,
        fontFamily: mono ? 'SpaceMono' : 'SpaceGrotesk_400Regular',
        borderWidth: 1,
        borderColor: focused ? COLORS.primary : COLORS.border,
      }}
    />
  );
}

export default function RuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { rules, apps, refreshRules } = useRouting();

  const isNew = id === 'new';
  const existingRule = isNew ? null : rules.find((r) => r.id === id) ?? null;

  const [name, setName] = useState('');
  const [intentType, setIntentType] = useState('email');
  const [conditionField, setConditionField] = useState('');
  const [conditionOperator, setConditionOperator] = useState('contains');
  const [conditionValue, setConditionValue] = useState('');
  const [destPackage, setDestPackage] = useState('');
  const [destDisplayName, setDestDisplayName] = useState('');
  const [priority, setPriority] = useState('50');
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingRule) {
      setName(existingRule.name);
      setIntentType(existingRule.intent_type);
      setConditionField(existingRule.condition_field ?? '');
      setConditionOperator(existingRule.condition_operator ?? 'contains');
      setConditionValue(existingRule.condition_value ?? '');
      setDestPackage(existingRule.dest_package);
      setDestDisplayName(existingRule.dest_display_name);
      setPriority(String(existingRule.priority));
      setIsEnabled(existingRule.is_enabled);
    }
  }, [existingRule]);

  // When intentType changes, reset destination if the selected app doesn't exist for the new type
  useEffect(() => {
    if (!destPackage) return;
    const stillValid = apps.some(
      (a) => a.package_name === destPackage && a.intent_type === intentType
    );
    if (!stillValid) {
      console.log('[RuleDetail] intent type changed, resetting destination');
      setDestPackage('');
      setDestDisplayName('');
    }
  }, [intentType]);

  // Apps filtered to the current intent type that are enabled
  const appsForIntent = apps.filter((a) => a.intent_type === intentType && a.is_enabled);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Rule name is required';
    if (!destPackage.trim()) errs.destPackage = 'Select a destination app';
    const p = parseInt(priority, 10);
    if (isNaN(p) || p < 0 || p > 100) errs.priority = 'Priority must be 0–100';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, destPackage, priority]);

  const handleSave = useCallback(async () => {
    console.log('[RuleDetail] save pressed', { id, name, intentType, destPackage });
    if (!validate()) return;
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        intent_type: intentType,
        condition_field: conditionField.trim() || null,
        condition_operator: conditionField.trim() ? conditionOperator : null,
        condition_value: conditionField.trim() && conditionValue.trim() ? conditionValue.trim() : null,
        dest_package: destPackage.trim(),
        dest_display_name: destDisplayName.trim(),
        priority: parseInt(priority, 10),
        is_enabled: isEnabled,
      };

      if (isNew) {
        const { error } = await supabase
          .from('routing_rules')
          .insert({ ...payload, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('routing_rules')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      }
      console.log('[RuleDetail] save success', { id, name });
      await refreshRules();
      router.back();
    } catch (err) {
      console.error('[RuleDetail] save error', err);
      Alert.alert('Save failed', 'Could not save the rule. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [validate, user, isNew, id, name, intentType, conditionField, conditionOperator, conditionValue, destPackage, destDisplayName, priority, isEnabled, refreshRules, router]);

  const handleDelete = useCallback(() => {
    console.log('[RuleDetail] delete pressed', { id });
    Alert.alert('Delete rule?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete rule',
        style: 'destructive',
        onPress: async () => {
          console.log('[RuleDetail] delete confirmed', { id });
          try {
            await supabase.from('routing_rules').delete().eq('id', id);
            await refreshRules();
            router.back();
          } catch (err) {
            console.error('[RuleDetail] delete error', err);
          }
        },
      },
    ]);
  }, [id, refreshRules, router]);

  const title = isNew ? 'New Rule' : 'Edit Rule';

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: !isNew
            ? () => (
                <AnimatedPressable
                  onPress={handleDelete}
                  style={{ padding: 4 }}
                >
                  <Trash2 size={20} color={COLORS.danger} />
                </AnimatedPressable>
              )
            : undefined,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rule Name */}
          <View>
            <FormLabel text="Rule name" required />
            <FormInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Work emails → Outlook"
            />
            {errors.name && (
              <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>
                {errors.name}
              </Text>
            )}
          </View>

          {/* Intent Type */}
          <View>
            <FormLabel text="Intent type" required />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {INTENT_TYPES.map((type) => {
                const isSelected = intentType === type;
                const meta = INTENT_META[type];
                return (
                  <AnimatedPressable
                    key={type}
                    onPress={() => {
                      console.log('[RuleDetail] intent type selected:', type);
                      setIntentType(type);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: isSelected ? `${meta.color}20` : COLORS.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: isSelected ? meta.color : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? meta.color : COLORS.textSecondary,
                        fontSize: 12,
                        fontFamily: 'SpaceGrotesk_500Medium',
                      }}
                    >
                      {meta.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Condition Field */}
          <View>
            <FormLabel text="Condition field (optional)" />
            <FormInput
              value={conditionField}
              onChangeText={setConditionField}
              placeholder="e.g. recipient, file_size_mb"
            />
            <Text
              style={{
                color: COLORS.textTertiary,
                fontSize: 11,
                marginTop: 4,
                fontFamily: 'SpaceGrotesk_400Regular',
              }}
            >
              Leave empty for a default (catch-all) rule
            </Text>
          </View>

          {/* Condition Operator */}
          {conditionField.trim() !== '' && (
            <View>
              <FormLabel text="Condition operator" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {OPERATORS.map((op) => {
                  const isSelected = conditionOperator === op.value;
                  return (
                    <AnimatedPressable
                      key={op.value}
                      onPress={() => {
                        console.log('[RuleDetail] operator selected:', op.value);
                        setConditionOperator(op.value);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: isSelected ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? COLORS.primary : COLORS.textSecondary,
                          fontSize: 12,
                          fontFamily: 'SpaceGrotesk_500Medium',
                        }}
                      >
                        {op.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Condition Value */}
          {conditionField.trim() !== '' && (
            <View>
              <FormLabel text="Condition value" />
              <FormInput
                value={conditionValue}
                onChangeText={setConditionValue}
                placeholder="e.g. @company.com"
              />
            </View>
          )}

          {/* Destination App Picker */}
          <View>
            <FormLabel text="Destination app" required />
            {appsForIntent.length === 0 ? (
              <View
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: COLORS.textTertiary,
                    fontSize: 13,
                    fontFamily: 'SpaceGrotesk_400Regular',
                    textAlign: 'center',
                  }}
                >
                  No apps enabled for this type — go to the Apps tab first
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {appsForIntent.map((app) => {
                  const isSelected = destPackage === app.package_name;
                  return (
                    <AnimatedPressable
                      key={app.id}
                      onPress={() => {
                        console.log('[RuleDetail] destination app selected:', app.display_name, app.package_name);
                        setDestPackage(app.package_name);
                        setDestDisplayName(app.display_name);
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: isSelected ? COLORS.primary : COLORS.border,
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? COLORS.primary : COLORS.text,
                          fontSize: 13,
                          fontFamily: 'SpaceGrotesk_600SemiBold',
                        }}
                      >
                        {app.display_name}
                      </Text>
                      <Text
                        style={{
                          color: COLORS.textTertiary,
                          fontSize: 10,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        }}
                        numberOfLines={1}
                      >
                        {app.package_name}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            )}
            {errors.destPackage && (
              <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 6 }}>
                {errors.destPackage}
              </Text>
            )}
          </View>

          {/* Priority */}
          <View>
            <FormLabel text="Priority (0–100)" />
            <FormInput
              value={priority}
              onChangeText={setPriority}
              placeholder="50"
              keyboardType="numeric"
            />
            {errors.priority && (
              <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>
                {errors.priority}
              </Text>
            )}
          </View>

          {/* Enabled Toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              padding: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 14,
                fontFamily: 'SpaceGrotesk_500Medium',
              }}
            >
              Enabled
            </Text>
            <Switch
              value={isEnabled}
              onValueChange={(val) => {
                console.log('[RuleDetail] enabled toggle:', val);
                setIsEnabled(val);
              }}
              trackColor={{ false: COLORS.surfaceElevated, true: `${COLORS.accent}80` }}
              thumbColor={isEnabled ? COLORS.accent : COLORS.textTertiary}
              ios_backgroundColor={COLORS.surfaceElevated}
            />
          </View>

          {/* Save Button */}
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              marginTop: 8,
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
              {saving ? 'Saving...' : isNew ? 'Create rule' : 'Save changes'}
            </Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
