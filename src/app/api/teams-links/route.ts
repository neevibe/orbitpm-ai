import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser, serverPermission, serverDepartment, normalizeDept, dependsOnDepartment } from '@/lib/api-auth';

/**
 * Teams deep links (Phase 3a) — attach an MS Teams conversation to a project
 * or task. Stores link + title only (no message content is cached in v1).
 *
 * Visibility follows the register's departmental rules: you can list links
 * for a project only if you could see that project, and create/delete links
 * only in your own department (admins unscoped).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TEAMS_URL_RE = /^https:\/\/(teams\.microsoft\.com|teams\.live\.com)\//i;

const missingTable = (msg?: string) => !!msg && msg.toLowerCase().includes('does not exist');

/** Can this user see the given project under the departmental rules? */
async function projectAccess(client: ReturnType<typeof db>, code: string, userDept: string, admin: boolean) {
  const { data: proj } = await client
    .from('projects')
    .select('department_id, classified_dependencies')
    .eq('project_code', code)
    .maybeSingle();
  if (!proj) return { exists: false, canSee: false, ownDept: false };
  if (admin) return { exists: true, canSee: true, ownDept: true };
  const { data: dept } = proj.department_id
    ? await client.from('departments').select('name').eq('id', proj.department_id).maybeSingle()
    : { data: null };
  const projDept = normalizeDept(dept?.name || '');
  const ownDept = !!userDept && projDept === userDept;
  const shared = dependsOnDepartment(proj.classified_dependencies, userDept);
  return { exists: true, canSee: ownDept || shared, ownDept };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const code = request.nextUrl.searchParams.get('project') || '';
  if (!code) return NextResponse.json({ error: 'project query param required.' }, { status: 400 });

  const client = db();
  const admin = serverPermission(auth.user) === 'admin';
  const userDept = normalizeDept(serverDepartment(auth.user));
  const access = await projectAccess(client, code, userDept, admin);
  if (!access.exists || !access.canSee) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data, error } = await client
    .from('teams_links')
    .select('*')
    .eq('project_code', code)
    .order('created_at', { ascending: false });
  if (error) {
    if (missingTable(error.message)) return NextResponse.json({ configured: false, links: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ configured: true, links: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const client = db();
  const admin = serverPermission(auth.user) === 'admin';
  const userDept = normalizeDept(serverDepartment(auth.user));

  try {
    const body = await request.json();
    const { action, projectCode, taskId, title, url, id } = body as {
      action: 'create' | 'delete';
      projectCode?: string;
      taskId?: string | null;
      title?: string;
      url?: string;
      id?: string;
    };

    if (action === 'create') {
      if (!projectCode || !title?.trim() || !url?.trim()) {
        return NextResponse.json({ error: 'projectCode, title and url are required.' }, { status: 400 });
      }
      if (!TEAMS_URL_RE.test(url.trim())) {
        return NextResponse.json({ error: 'That doesn’t look like a Microsoft Teams link (must start with https://teams.microsoft.com/…).' }, { status: 400 });
      }
      const access = await projectAccess(client, projectCode, userDept, admin);
      if (!access.exists || !access.canSee) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
      // linking is an edit: own department (or admin) only
      if (!admin && !access.ownDept) return NextResponse.json({ error: 'You can only link conversations on your own department’s projects.' }, { status: 403 });

      const meta = { ...(auth.user.user_metadata || {}) } as Record<string, string>;
      const { data, error } = await client.from('teams_links').insert({
        project_code: projectCode,
        task_id: taskId || null,
        title: title.trim().slice(0, 120),
        deep_link_url: url.trim(),
        created_by: auth.user.id,
        created_by_name: meta.full_name || auth.user.email || '',
      }).select().single();
      if (error) {
        if (missingTable(error.message)) return NextResponse.json({ configured: false }, { status: 503 });
        throw error;
      }
      return NextResponse.json({ ok: true, link: data });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
      const { data: link } = await client.from('teams_links').select('project_code, created_by').eq('id', id).maybeSingle();
      if (!link) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
      const access = await projectAccess(client, link.project_code, userDept, admin);
      const isCreator = link.created_by === auth.user.id;
      if (!admin && !(access.ownDept || isCreator)) {
        return NextResponse.json({ error: 'Only the link creator, the owning department or an admin can remove it.' }, { status: 403 });
      }
      const { error } = await client.from('teams_links').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
