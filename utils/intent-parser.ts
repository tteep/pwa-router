export const INTENT_META: Record<
  string,
  { label: string; icon: string; color: string; scheme: string }
> = {
  email: { label: 'Email', icon: 'Mail', color: '#58A6FF', scheme: 'mailto:' },
  tel: { label: 'Phone', icon: 'Phone', color: '#3FB950', scheme: 'tel:' },
  geo: { label: 'Maps', icon: 'MapPin', color: '#F0883E', scheme: 'geo:' },
  pdf: { label: 'PDF', icon: 'FileText', color: '#F85149', scheme: 'content:' },
  image: { label: 'Image', icon: 'Image', color: '#BC8CFF', scheme: 'content:' },
  text: { label: 'Text', icon: 'Type', color: '#8B949E', scheme: 'content:' },
  browser: { label: 'Browser', icon: 'Globe', color: '#58A6FF', scheme: 'https:' },
  contacts: { label: 'Contacts', icon: 'Users', color: '#3FB950', scheme: 'content:' },
  custom: { label: 'Custom', icon: 'Zap', color: '#D29922', scheme: '' },
};

export function getIntentMeta(type: string) {
  return INTENT_META[type] ?? INTENT_META.custom;
}

export function buildLaunchUrl(intentType: string, rawData: Record<string, unknown>): string {
  const meta = getIntentMeta(intentType);
  switch (intentType) {
    case 'email':
      return `mailto:${rawData.recipient ?? ''}?subject=${encodeURIComponent(String(rawData.subject ?? ''))}`;
    case 'tel':
      return `tel:${rawData.phone_number ?? ''}`;
    case 'geo':
      if (rawData.lat && rawData.lng) {
        return `geo:${rawData.lat},${rawData.lng}`;
      }
      return `geo:0,0?q=${encodeURIComponent(String(rawData.address ?? ''))}`;
    case 'browser':
      return String(rawData.url ?? 'https://');
    default:
      return meta.scheme;
  }
}
