import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const supabaseAnonKey = 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  }
});

export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};
