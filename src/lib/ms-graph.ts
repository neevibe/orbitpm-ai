import type { SupabaseClient } from '@supabase/supabase-js';
import { MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT, MS_SCOPES } from '@/lib/ms-oauth';

/**
 * Microsoft Graph access on behalf of a signed-in user (delegated tokens
 * stored in ms_connections by the OAuth callback). Access tokens live ~1h;
 * we refresh transparently and persist the rotated refresh token.
 */

type TokenResult = { token: string } | { error: string; status: number };

export async function getGraphToken(db: SupabaseClient, userId: string): Promise<TokenResult> {
  const { data: conn, error } = await db
    .from('ms_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.message.toLowerCase().includes('does not exist')) {
    return { error: 'Microsoft integration is not set up yet (missing ms_connections table).', status: 503 };
  }
  if (!conn) {
    return { error: 'Connect your Microsoft account first — go to Integrations and click Connect on Microsoft Teams.', status: 412 };
  }

  // still fresh? (2-minute safety margin)
  if (new Date(conn.expires_at).getTime() - Date.now() > 2 * 60 * 1000) {
    return { token: conn.access_token };
  }

  if (!conn.refresh_token) {
    return { error: 'Your Microsoft session expired. Reconnect in Integrations.', status: 412 };
  }

  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      scope: MS_SCOPES,
    }),
  });
  const tokens = await res.json();
  if (!res.ok || !tokens.access_token) {
    return { error: 'Your Microsoft session expired. Reconnect in Integrations.', status: 412 };
  }

  await db.from('ms_connections').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || conn.refresh_token,
    expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return { token: tokens.access_token };
}

/** Thin Graph call wrapper — returns parsed JSON or a friendly error. */
export async function graphFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (res.status === 204 || res.status === 202) return { ok: true as const, data: null };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message || `Microsoft Graph error (HTTP ${res.status})`;
    return { ok: false as const, error: msg, status: res.status };
  }
  return { ok: true as const, data };
}
