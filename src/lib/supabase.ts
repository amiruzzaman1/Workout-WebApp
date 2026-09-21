import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// The publishable key is designed to be public; Row Level Security protects the data.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://zglxidulxgjfschsrvqm.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_Mek_7Z1R8zYLn6SdEhWVFw__ImjnoLU';

/**
 * Checks that a password is right for an email, without touching the signed in session. It is one plain request to
 * the same login address, not a second client, and it never signs out, because signing out would end every session of
 * that account. Wrong password gives false. A network or server problem throws, so it is not shown as a wrong password.
 */
export async function verifyPassword(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) return true;
  if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
  throw new Error('Could not check your password right now. Try again in a moment.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
