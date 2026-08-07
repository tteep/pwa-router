export const ANDROID_ROLES = {
  BROWSER: 'android.app.role.BROWSER',
  DIALER: 'android.app.role.DIALER',
  SMS: 'android.app.role.SMS',
  EMAIL: 'android.app.role.MAIL',
  HOME: 'android.app.role.HOME',
  CALL_REDIRECTION: 'android.app.role.CALL_REDIRECTION',
} as const;

export const ANDROID_ROLE_LABELS: Record<string, string> = {
  'android.app.role.BROWSER': 'Browser',
  'android.app.role.DIALER': 'Dialer',
  'android.app.role.SMS': 'SMS',
  'android.app.role.MAIL': 'Email',
  'android.app.role.HOME': 'Home',
  'android.app.role.CALL_REDIRECTION': 'Call Redirection',
};

export const INTENT_ACTIONS = {
  VIEW: 'android.intent.action.VIEW',
  SEND: 'android.intent.action.SEND',
  SENDTO: 'android.intent.action.SENDTO',
  DIAL: 'android.intent.action.DIAL',
  CALL: 'android.intent.action.CALL',
  PICK: 'android.intent.action.PICK',
} as const;

export const MIME_TYPES = {
  PDF: 'application/pdf',
  IMAGE_ANY: 'image/*',
  TEXT_PLAIN: 'text/plain',
  ANY: '*/*',
} as const;

// Maps each intent_type to the Android query params needed
export const INTENT_TYPE_QUERY: Record<string, {
  action: string;
  mimeType?: string;
  scheme?: string;
  role?: string;
}> = {
  email:    { action: INTENT_ACTIONS.SENDTO, scheme: 'mailto', role: ANDROID_ROLES.EMAIL },
  tel:      { action: INTENT_ACTIONS.DIAL,   scheme: 'tel',    role: ANDROID_ROLES.DIALER },
  geo:      { action: INTENT_ACTIONS.VIEW,   scheme: 'geo' },
  pdf:      { action: INTENT_ACTIONS.VIEW,   mimeType: MIME_TYPES.PDF },
  image:    { action: INTENT_ACTIONS.VIEW,   mimeType: MIME_TYPES.IMAGE_ANY },
  text:     { action: INTENT_ACTIONS.SEND,   mimeType: MIME_TYPES.TEXT_PLAIN, role: ANDROID_ROLES.SMS },
  browser:  { action: INTENT_ACTIONS.VIEW,   scheme: 'https',  role: ANDROID_ROLES.BROWSER },
  contacts: { action: INTENT_ACTIONS.PICK,   scheme: 'content' },
};
