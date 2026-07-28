import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';
import { MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT, MS_SCOPES, appOrigin, signState } from '@/lib/ms-oauth';

/**
 * Microsoft Teams integration — status / connect / disconnect (Phase 3b setup).
 *
 * Flow: the Integrations page asks for status; when the Azure env vars exist,
 * "Connect" returns a Microsoft sign-in URL (delegated OAuth, authorization
 * code flow). The /callback route stores the tokens per user. Until the env
 * vars exist, status reports configured:false and the UI shows the IT-admin
 * checklist instead of a broken button.
 *
 * Required env (Vercel → Settings → Environment Variables):
 *   MS_TEAMS_CLIENT_ID      — Azure AD app registration (application/client ID)
 *   MS_TEAMS_CLIENT_SECRET  — client secret value
 *   MS_TEAMS_TENANT_ID      — directory (tenant) ID; defaults to 'organizations'
 * Azure redirect URI to register: https://<your-app>/api/integrations/teams/callback
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
// Supabase surfaces a missing table as either Postgres' `relation ... does not
// exist` or PostgREST's `Could not find the table ... in the schema cache`.
const missingTable = (msg?: string) => !!msg && /does not exist|could not find the table|schema cache/i.test(msg);

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const configured = !!(MS_CLIENT_ID && MS_CLIENT_SECRET);
  let connected = false;
  let account = '';
  let tableReady = true;

  if (configured || true) { // connection row is meaningful even pre-config
    const { data, error } = await db().from('ms_connections').select('account_email, account_name').eq('user_id', auth.user.id).maybeSingle();
    if (error && missingTable(error.message)) tableReady = false;
    else if (data) { connected = true; account = data.account_email || data.account_name; }
  }

  return NextResponse.json({
    configured,
    tableReady,
    connected,
    account,
    redirectUri: `${appOrigin(request)}/api/integrations/teams/callback`,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({} as { action?: string }));

  if (body.action === 'connect') {
    if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Microsoft app credentials are not configured on the server yet.' }, { status: 503 });
    }
    const redirectUri = `${appOrigin(request)}/api/integrations/teams/callback`;
    const url =
      `https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/oauth2/v2.0/authorize` +
      `?client_id=${encodeURIComponent(MS_CLIENT_ID)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(MS_SCOPES)}` +
      `&state=${encodeURIComponent(signState(auth.user.id))}`;
    return NextResponse.json({ url });
  }

  if (body.action === 'disconnect') {
    const { error } = await db().from('ms_connections').delete().eq('user_id', auth.user.id);
    if (error && !missingTable(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
