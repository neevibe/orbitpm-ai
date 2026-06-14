import { createClient } from '@supabase/supabase-js';

// Read from environment (set these in Vercel → Project → Settings → Environment Variables).
// Falls back to project defaults for local dev convenience.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  }
});

export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};
