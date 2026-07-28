import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth';
import { recordAudit, actorFromToken } from '@/lib/audit';
import { deliverToWebhook, invalidateWebhookCache, WEBHOOK_SETTING_KEY, WEBHOOK_URL_RE } from '@/lib/teams-alerts';
import { appOrigin } from '@/lib/ms-oauth';

/**
 * Teams channel alerts config (super-admin) — stores the incoming-webhook URL
 * in org_settings. The URL is a write-only secret: GET returns a masked
 * fingerprint, never the full URL.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const missingTable = (msg?: string) => !!msg && /does not exist|could not find the table|schema cache/i.test(msg);

const mask = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.hostname}/…${url.slice(-6)}`;
  } catch {
    return '(saved)';
  }
};

async function readUrl(): Promise<{ url: string | null; tableReady: boolean }> {
  const { data, error } = await db().from('org_settings').select('value').eq('key', WEBHOOK_SETTING_KEY).maybeSingle();
  if (error) return { url: null, tableReady: !missingTable(error.message) };
  const url = typeof data?.value === 'string' ? data.value : (data?.value as { url?: string })?.url || null;
  return { url, tableReady: true };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { url, tableReady } = await readUrl();
  return NextResponse.json({ configured: !!url, tableReady, masked: url ? mask(url) : '' });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({} as { action?: string; url?: string }));
  const actor = await actorFromToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim());

  if (body.action === 'save') {
    const url = String(body.url || '').trim();
    if (!WEBHOOK_URL_RE.test(url)) {
      return NextResponse.json({ error: 'That doesn’t look like a Teams webhook URL (expected …webhook.office.com/… or a Power Automate …logic.azure.com/… URL).' }, { status: 400 });
    }
    const { error } = await db().from('org_settings').upsert({
      key: WEBHOOK_SETTING_KEY,
      value: { url },
      updated_at: new Date().toISOString(),
      updated_by: actor?.email || auth.user.email || '',
    }, { onConflict: 'key' });
    if (error) {
      if (missingTable(error.message)) {
        return NextResponse.json({ error: 'Run supabase/migrations/0009_org_settings.sql in the Supabase SQL Editor first.' }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    invalidateWebhookCache();
    await recordAudit({ actor, action: 'teams.alerts_configured', module: 'teams', entityType: 'setting', entityId: WEBHOOK_SETTING_KEY, request });
    return NextResponse.json({ ok: true, masked: mask(url) });
  }

  if (body.action === 'test') {
    const { url } = await readUrl();
    if (!url) return NextResponse.json({ error: 'No webhook saved yet.' }, { status: 400 });
    const res = await deliverToWebhook(url, {
      title: 'Xyrenis test alert',
      text: `Channel alerts are wired up — sent by ${actor?.name || actor?.email || 'an admin'} from the Integrations page.`,
      link: `${appOrigin(request)}/command-center`,
    });
    if (!res.ok) return NextResponse.json({ error: res.detail || 'Delivery failed.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'clear') {
    const { error } = await db().from('org_settings').delete().eq('key', WEBHOOK_SETTING_KEY);
    if (error && !missingTable(error.message)) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateWebhookCache();
    await recordAudit({ actor, action: 'teams.alerts_disabled', module: 'teams', entityType: 'setting', entityId: WEBHOOK_SETTING_KEY, request });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
