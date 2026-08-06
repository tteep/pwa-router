import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://eomrynglzkjeygguvtyw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbXJ5bmdsemtqZXlnZ3V2dHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDU0MDEsImV4cCI6MjEwMTYyMTQwMX0.K-22c2ypgHJZbrCCsLjSy1qtrS12oNKIKXhC528CA5o";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
