import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyState, appOrigin, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT } from '@/lib/ms-oauth';

/**
 * Microsoft OAuth callback — exchanges the authorization code for tokens and
 * stores them for the user identified by the HMAC-signed state. Browser
 * redirect target, so errors land back on /integrations with a reason.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

export async function GET(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(`${appOrigin(request)}/integrations?${q}`);

  const params = request.nextUrl.searchParams;
  const err = params.get('error');
  if (err) return back(`teams=error&reason=${encodeURIComponent(params.get('error_description') || err)}`);

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return back('teams=error&reason=Missing%20code%20or%20state');

  const userId = verifyState(state);
  if (!userId) return back('teams=error&reason=Sign-in%20link%20expired%20—%20try%20Connect%20again');

  try {
    const redirectUri = `${appOrigin(request)}/api/integrations/teams/callback`;
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return back(`teams=error&reason=${encodeURIComponent(tokens.error_description?.slice(0, 140) || 'Token exchange failed')}`);
    }

    // who connected? (also validates the token works against Graph)
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = meRes.ok ? await meRes.json() : {};

    const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { error } = await db.from('ms_connections').upsert({
      user_id: userId,
      account_email: me.mail || me.userPrincipalName || '',
      account_name: me.displayName || '',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      scopes: tokens.scope || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) {
      const reason = /does not exist|could not find the table|schema cache/i.test(error.message)
        ? 'Run migration 0008_ms_connections.sql first'
        : error.message.slice(0, 140);
      return back(`teams=error&reason=${encodeURIComponent(reason)}`);
    }

    return back('teams=connected');
  } catch {
    return back('teams=error&reason=Unexpected%20error%20during%20Microsoft%20sign-in');
  }
}
