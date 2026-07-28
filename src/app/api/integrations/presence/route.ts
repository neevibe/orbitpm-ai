import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';
import { getGraphToken, graphFetch } from '@/lib/ms-graph';

/**
 * Teams presence for owner avatars (dashboard collaboration UI). Resolves
 * work emails → AAD user ids → live presence, via the caller's own delegated
 * Graph token. Degrades to {available:false} whenever the caller hasn't
 * connected Microsoft (or the tenant blocks a scope) — the UI simply hides
 * the dots, it never fabricates a status.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Graph availability → traffic-light bucket the UI can color directly. */
function bucket(availability: string): 'available' | 'busy' | 'away' | 'offline' {
  const a = (availability || '').toLowerCase();
  if (a.startsWith('avail')) return 'available';
  if (a === 'busy' || a === 'donotdisturb' || a.startsWith('presenting')) return 'busy';
  if (a === 'away' || a === 'berightback') return 'away';
  return 'offline';
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { emails?: unknown };
  const raw: unknown[] = Array.isArray(body.emails) ? body.emails : [];
  const emails = raw
    .map(e => String(e).trim().toLowerCase())
    .filter(e => EMAIL_RE.test(e))
    .slice(0, 25);
  if (emails.length === 0) return NextResponse.json({ available: false, presence: {} });

  const tok = await getGraphToken(db(), auth.user.id);
  if ('error' in tok) return NextResponse.json({ available: false, presence: {} });

  try {
    // email → AAD object id (unresolvable addresses are skipped quietly)
    const ids: { email: string; id: string }[] = [];
    await Promise.all(emails.map(async email => {
      const r = await graphFetch(tok.token, `/users/${encodeURIComponent(email)}?$select=id`);
      const id = r.ok ? (r.data as { id?: string })?.id : undefined;
      if (id) ids.push({ email, id });
    }));
    if (ids.length === 0) return NextResponse.json({ available: false, presence: {} });

    const r = await graphFetch(tok.token, '/communications/getPresencesByUserId', {
      method: 'POST',
      body: JSON.stringify({ ids: ids.map(x => x.id) }),
    });
    if (!r.ok) return NextResponse.json({ available: false, presence: {} });

    const byId = new Map(
      ((r.data as { value?: { id: string; availability: string }[] })?.value || []).map(p => [p.id, p.availability])
    );
    const presence: Record<string, { status: string; label: string }> = {};
    for (const { email, id } of ids) {
      const availability = byId.get(id);
      if (!availability) continue;
      presence[email] = { status: bucket(availability), label: availability };
    }
    return NextResponse.json({ available: true, presence });
  } catch {
    return NextResponse.json({ available: false, presence: {} });
  }
}
