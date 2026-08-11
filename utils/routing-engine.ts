export interface RoutingRule {
  id: string;
  name: string;
  intent_type: string;
  condition_field: string | null;
  condition_operator: string | null;
  condition_value: string | null;
  dest_package: string;
  dest_display_name: string;
  dest_pwa_url?: string | null;
  dest_pwa_name?: string | null;
  priority: number;
  is_enabled: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PwaApp {
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

/**
 * Builds the final URL to open for a PWA, appending intent-specific query params.
 */
export function buildPwaUrl(
  pwaBaseUrl: string,
  intentType: string,
  rawData: Record<string, unknown>
): string {
  console.log('[RoutingEngine] buildPwaUrl', { pwaBaseUrl, intentType, rawData });
  const base = pwaBaseUrl.replace(/\/$/, '');
  switch (intentType) {
    case 'email':
      return `${base}?to=${encodeURIComponent(String(rawData.recipient ?? ''))}&subject=${encodeURIComponent(String(rawData.subject ?? ''))}`;
    case 'geo':
      return `${base}?q=${encodeURIComponent(String(rawData.address ?? rawData.query ?? ''))}`;
    case 'browser':
      return `${base}?url=${encodeURIComponent(String(rawData.url ?? ''))}`;
    case 'tel':
      return `${base}?tel=${encodeURIComponent(String(rawData.number ?? rawData.phone_number ?? ''))}`;
    case 'text':
      return `${base}?body=${encodeURIComponent(String(rawData.body ?? rawData.content ?? ''))}`;
    default:
      return base;
  }
}
