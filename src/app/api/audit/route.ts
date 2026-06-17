import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auditClient, recordAudit, actorFromToken } from '@/lib/audit';

/**
 * Audit log API.
 *   GET  → admin-gated query (filters) + dashboard widgets.
 *   POST → record a client-originated event (login / logout / profile), with the
 *          caller's bearer token used to identify the actor.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_ROLES = ['cco', 'admin', 'super_admin'];

function bearer(request: Request) {
  return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

/** Confirm the caller is an admin (role OR permission === 'admin'). */
async function requireAdmin(request: Request) {
  const token = bearer(request);
  if (!token) return { ok: false as const, status: 401, error: 'Missing access token.' };
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, error: 'Invalid or expired session.' };
  const m = data.user.user_metadata || {};
  const isAdmin =
    ADMIN_ROLES.includes((m.role as string) || '') ||
    (m.permission as string) === 'admin' ||
    (data.user.email || '').toLowerCase() === 'neeraj.p@bialairport.com';
  if (!isAdmin) return { ok: false as const, status: 403, error: 'Admin access required.' };
  return { ok: true as const };
}

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const url = new URL(request.url);
  const q = (k: string) => url.searchParams.get(k)?.trim() || '';
  const search = q('search').toLowerCase();
  const action = q('action');
  const module = q('module');
  const department = q('department');
  const status = q('status');
  const from = q('from');
  const to = q('to');
  const limit = Math.min(parseInt(q('limit') || '200', 10) || 200, 1000);

  const db = auditClient();

  // ---- filtered rows for the table ----
  let query = db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (action) query = query.eq('action', action);
  if (module) query = query.eq('module', module);
  if (department) query = query.eq('actor_department', department);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: rows, error } = await query;
  if (error) {
    // Table missing (migration not run) → return an empty, well-formed payload.
    return NextResponse.json({
      rows: [],
      widgets: emptyWidgets(),
      tableReady: false,
      note: 'audit_log table not found — run supabase/migrations/0002_audit_log.sql.',
    });
  }

  let filtered = rows || [];
  if (search) {
    filtered = filtered.filter(r =>
      [r.actor_name, r.actor_email, r.action, r.module, r.entity_name, r.entity_id, r.ip_address]
        .some(v => (v || '').toString().toLowerCase().includes(search)));
  }

  // ---- widgets (computed from recent activity + the user directory) ----
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();
  const { data: recent } = await db
    .from('audit_log')
    .select('actor_email, actor_name, action, module, status, created_at')
    .gte('created_at', since7)
    .order('created_at', { ascending: false })
    .limit(5000);
  const recentRows = recent || [];

  const since24 = Date.now() - DAY;
  const dau = new Set(
    recentRows.filter(r => new Date(r.created_at).getTime() >= since24 && r.actor_email).map(r => r.actor_email),
  ).size;

  const failedLogins = recentRows.filter(r => r.action === 'auth.login' && r.status === 'failure').length;
  const permissionChanges = recentRows.filter(r => r.action?.startsWith('user.')).length;

  const counts = new Map<string, { email: string; name: string; count: number }>();
  for (const r of recentRows) {
    if (!r.actor_email) continue;
    const e = counts.get(r.actor_email) || { email: r.actor_email, name: r.actor_name || r.actor_email, count: 0 };
    e.count++;
    counts.set(r.actor_email, e);
  }
  const mostActive = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  // 14-day activity trend
  const trend: { date: string; count: number }[] = [];
  const { data: trendRows } = await db
    .from('audit_log')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 14 * DAY).toISOString());
  const byDay = new Map<string, number>();
  (trendRows || []).forEach(r => {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) || 0) + 1);
  });
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    trend.push({ date: d, count: byDay.get(d) || 0 });
  }

  // user directory counts (service role)
  let totalUsers = 0, activeUsers = 0;
  if (SERVICE_ROLE_KEY) {
    try {
      const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
      totalUsers = list?.users.length || 0;
      activeUsers = (list?.users || []).filter(u => {
        const m = u.user_metadata || {};
        return m.account_status === 'active' || m.activated === true || m.must_change_password === false;
      }).length;
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    rows: filtered,
    tableReady: true,
    widgets: {
      totalUsers,
      activeUsers,
      dailyActiveUsers: dau,
      failedLogins,
      permissionChanges,
      mostActive,
      trend,
      totalEvents7d: recentRows.length,
    },
  });
}

function emptyWidgets() {
  return {
    totalUsers: 0, activeUsers: 0, dailyActiveUsers: 0, failedLogins: 0,
    permissionChanges: 0, mostActive: [], trend: [], totalEvents7d: 0,
  };
}

export async function POST(request: Request) {
  let body: { action?: string; module?: string; status?: string; entityType?: string; entityName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.action) return NextResponse.json({ error: 'action is required.' }, { status: 400 });

  // Only allow a safe set of client-reportable events.
  const ALLOWED = ['auth.login', 'auth.logout', 'auth.login_failed', 'profile.update'];
  if (!ALLOWED.includes(body.action)) {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  const actor = await actorFromToken(bearer(request));
  await recordAudit({
    actor,
    action: body.action,
    module: body.module || 'auth',
    status: body.status === 'failure' ? 'failure' : 'success',
    entityType: body.entityType,
    entityName: body.entityName,
    request,
  });
  return NextResponse.json({ ok: true });
}
