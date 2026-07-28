import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser, serverPermission, serverDepartment, normalizeDept, dependsOnDepartment } from '@/lib/api-auth';

/**
 * Activity feed (dashboard) — recent real events from the audit trail:
 * project/risk mutations and Teams channel alerts that were actually sent.
 * Departmental privacy applies: non-admins only see events on projects they
 * could see in the register (own department + dependency-shared).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const FEED_ACTIONS = [
  'project.create', 'project.update', 'project.archive', 'project.restore', 'project.delete', 'project.split',
  'risk.create', 'risk.update', 'risk.delete',
  'teams.alert_sent',
];

const missingTable = (msg?: string) => !!msg && /does not exist|could not find the table|schema cache/i.test(msg);

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const admin = serverPermission(auth.user) === 'admin';
  const userDept = normalizeDept(serverDepartment(auth.user));
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 30, 1), 100);

  const { data, error } = await db
    .from('audit_log')
    .select('id, created_at, actor_name, actor_email, action, module, entity_type, entity_id, entity_name, new_value')
    .in('action', FEED_ACTIONS)
    .order('created_at', { ascending: false })
    .limit(admin ? limit : limit * 4); // headroom: scoping below drops rows
  if (error) {
    if (missingTable(error.message)) return NextResponse.json({ configured: false, events: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = data ?? [];

  if (!admin) {
    // visible project codes = own department + dependency-shared (same rule as the register)
    const [{ data: projects }, { data: depts }] = await Promise.all([
      db.from('projects').select('project_code, department_id, classified_dependencies'),
      db.from('departments').select('id, name'),
    ]);
    const deptName = new Map((depts ?? []).map(d => [d.id, normalizeDept(d.name || '')]));
    const visible = new Set(
      (projects ?? [])
        .filter(p => {
          const pd = p.department_id ? deptName.get(p.department_id) || '' : '';
          return (!!userDept && pd === userDept) || dependsOnDepartment(p.classified_dependencies, userDept);
        })
        .map(p => p.project_code)
    );
    // risk rows carry the risk code in entity_id; their project link lives in
    // new_value.projectId when present — accept either reference.
    rows = rows.filter(r => {
      const nv = (r.new_value ?? {}) as { projectId?: string };
      return (r.entity_id && visible.has(r.entity_id)) || (nv.projectId && visible.has(nv.projectId));
    }).slice(0, limit);
  }

  return NextResponse.json({
    configured: true,
    events: rows.map(r => ({
      id: r.id,
      at: r.created_at,
      actor: r.actor_name || r.actor_email || '',
      action: r.action,
      entityId: r.entity_id || '',
      entityName: r.entity_name || '',
      // teams.alert_sent rows: surface the alert title so the feed can say what went to the channel
      alertTitle: r.action === 'teams.alert_sent' ? ((r.new_value ?? {}) as { title?: string }).title || '' : '',
    })),
  });
}
