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
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};

/**
 * Return a VALID access token for authed API calls, refreshing it first if the
 * stored one is expired or about to expire. `getSession()` alone can hand back a
 * stale token (the background refresh timer may not have fired if the tab slept),
 * which the server then rejects as "Invalid or expired session". Returns null if
 * there is no recoverable session (caller should send the user to log in).
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  const expiresInMs = (session.expires_at ?? 0) * 1000 - Date.now();
  if (expiresInMs < 60_000) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
  }
  return session.access_token;
}

/**
 * Last-resort recovery when an authed API call still returns 401 (the stored
 * session is dead and couldn't be refreshed). Clears the bad session and sends
 * the user to log in cleanly, instead of leaving them on a page that shows
 * "Invalid or expired session".
 */
export async function signOutAndRelogin(): Promise<void> {
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.location.href = '/login';
}

/**
 * fetch() with the caller's Supabase access token attached (Phase 0: all
 * data-bearing API routes now require it). Merges any headers passed in.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token ?? ''}` },
  });
}
