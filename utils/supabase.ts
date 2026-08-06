import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use env vars if set, otherwise fall back to the project's Supabase credentials
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://eomrynglzkjeygguvtyw.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbXJ5bmdsemtqZXlnZ3V2dHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDU0MDEsImV4cCI6MjEwMTYyMTQwMX0.K-22c2ypgHJZbrCCsLjSy1qtrS12oNKIKXhC528CA5o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
