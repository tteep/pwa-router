export interface RoutingRule {
  id: string;
  name: string;
  intent_type: string;
  condition_field: string | null;
  condition_operator: string | null;
  condition_value: string | null;
  dest_package: string;
  dest_display_name: string;
  priority: number;
  is_enabled: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function evaluateRules(
  rules: RoutingRule[],
  intentType: string,
  rawData: Record<string, unknown>
): RoutingRule | null {
  const applicable = rules
    .filter((r) => r.is_enabled && r.intent_type === intentType)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of applicable) {
    if (!rule.condition_field) return rule;
    const fieldValue = String(rawData[rule.condition_field] ?? '');
    const condVal = rule.condition_value ?? '';
    switch (rule.condition_operator) {
      case 'equals':
        if (fieldValue === condVal) return rule;
        break;
      case 'contains':
        if (fieldValue.includes(condVal)) return rule;
        break;
      case 'starts_with':
        if (fieldValue.startsWith(condVal)) return rule;
        break;
      case 'greater_than':
        if (parseFloat(fieldValue) > parseFloat(condVal)) return rule;
        break;
      case 'less_than':
        if (parseFloat(fieldValue) < parseFloat(condVal)) return rule;
        break;
      case 'matches_regex':
        try {
          if (new RegExp(condVal).test(fieldValue)) return rule;
        } catch {
          // invalid regex
        }
        break;
    }
  }
  return null;
}
