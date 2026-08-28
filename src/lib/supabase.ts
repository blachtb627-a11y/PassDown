import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Falls back to a placeholder client (never actually reached) so importing this
// module never crashes the whole app before AuthGate can show a friendly setup screen.
export const supabase = createClient<Database>(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Only takes effect in a real browser (react-native-web) — gotrue-js
    // guards every URL-parsing codepath behind an isBrowser() check, so this
    // is a no-op on native. Needed so a password-recovery link's token in the
    // URL actually gets picked up into a session on the web build.
    detectSessionInUrl: true,
  },
});
