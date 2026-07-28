import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth';
import { recordAudit, actorFromToken } from '@/lib/audit';
import { canonicalOwnerName } from '@/lib/utils';
import { getSubdivisions, resolveHierarchy } from '@/lib/org-structure';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';

/**
 * Live data-sanity audit (admin) — inspects the REAL database, not the seed:
 *   • departments table vs per-department project counts (finds "missing"
 *     departments like Commercial Development instantly)
 *   • projects whose department_id resolves to nothing → the Unknown bucket
 *   • owner identity analysis against the employee roster: variant groups
 *     ("Ilora" + "Ilora Ghosh Banerjee"), compound strings, ambiguous short
 *     names, names matching nobody
 *   • subdivision values present in data vs the configured lists
 *   • status/progress and date contradictions
 *
 * POST action 'fix_owners' merges the unambiguous owner variants in place
 * (owner_name → roster full name), audit-logged. Nothing ambiguous is touched.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type Row = {
  project_code: string;
  name: string;
  department_id: string | null;
  subdivision: string | null;
  owner_name: string | null;
  status: string | null;
  progress: number | null;
  start_date: string | null;
  target_date: string | null;
  archived: boolean | null;
};

const ROSTER_BY_NAME = new Map(BIAL_EMPLOYEES.map(e => [e.name.trim().toLowerCase(), e.name]));

function classifyOwner(raw: string): 'exact' | 'variant' | 'compound' | 'ambiguous' | 'unknown' {
  const t = raw.trim();
  if (/[/,&+]|\band\b/i.test(t)) return 'compound';
  if (ROSTER_BY_NAME.has(t.toLowerCase())) return 'exact';
  const canonical = canonicalOwnerName(t);
  if (canonical !== t) return 'variant';
  // lone first name that didn't canonicalize: shared by 2+ people, or nobody
  const first = t.toLowerCase().split(/\s+/)[0];
  const matches = BIAL_EMPLOYEES.filter(e => e.name.toLowerCase().split(/\s+/).includes(first)).length;
  return matches >= 2 ? 'ambiguous' : 'unknown';
}

async function loadAll() {
  const client = db();
  const [{ data: depts, error: dErr }, { data: projects, error: pErr }] = await Promise.all([
    client.from('departments').select('id, name'),
    client.from('projects').select('project_code, name, department_id, subdivision, owner_name, status, progress, start_date, target_date, archived'),
  ]);
  if (dErr) throw new Error(`departments: ${dErr.message}`);
  if (pErr) throw new Error(`projects: ${pErr.message}`);
  return { depts: depts ?? [], projects: (projects ?? []) as Row[] };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { depts, projects } = await loadAll();
    const deptName = new Map(depts.map(d => [d.id, d.name]));
    const active = projects.filter(p => !p.archived);

    // ---- departments: registered rows vs actual project counts ----
    const deptReport = depts.map(d => ({
      name: d.name,
      active: active.filter(p => p.department_id === d.id).length,
      archived: projects.filter(p => p.archived && p.department_id === d.id).length,
    })).sort((a, b) => b.active - a.active);

    const unknownRows = active.filter(p => !p.department_id || !deptName.has(p.department_id));
    const unknownDepartment = {
      count: unknownRows.length,
      sample: unknownRows.slice(0, 15).map(p => ({ code: p.project_code, name: p.name, owner: p.owner_name || '' })),
    };

    // ---- owners: identity analysis against the roster ----
    const ownerCounts = new Map<string, number>();
    active.forEach(p => {
      const o = (p.owner_name || '').trim();
      if (o) ownerCounts.set(o, (ownerCounts.get(o) || 0) + 1);
    });
    const groups = new Map<string, { name: string; count: number }[]>();
    const compound: { name: string; count: number }[] = [];
    const ambiguous: { name: string; count: number }[] = [];
    const unknown: { name: string; count: number }[] = [];
    for (const [name, count] of ownerCounts) {
      const kind = classifyOwner(name);
      if (kind === 'compound') { compound.push({ name, count }); continue; }
      if (kind === 'ambiguous') { ambiguous.push({ name, count }); continue; }
      if (kind === 'unknown') { unknown.push({ name, count }); continue; }
      const canonical = canonicalOwnerName(name);
      if (!groups.has(canonical)) groups.set(canonical, []);
      groups.get(canonical)!.push({ name, count });
    }
    // only groups where a merge actually changes something (variant present, or 2+ spellings)
    const variantGroups = [...groups.entries()]
      .filter(([canonical, variants]) => variants.length > 1 || (variants.length === 1 && variants[0].name !== canonical))
      .map(([canonical, variants]) => ({ canonical, variants: variants.sort((a, b) => b.count - a.count) }))
      .sort((a, b) => b.variants.reduce((s, v) => s + v.count, 0) - a.variants.reduce((s, v) => s + v.count, 0));

    // ---- subdivisions: data values vs configured lists ----
    const subMap = new Map<string, Map<string, number>>();
    active.forEach(p => {
      const dept = p.department_id ? deptName.get(p.department_id) || 'Unknown' : 'Unknown';
      const h = resolveHierarchy(dept, p.subdivision);
      if (!h.subdivision) return;
      if (!subMap.has(h.vertical)) subMap.set(h.vertical, new Map());
      const m = subMap.get(h.vertical)!;
      m.set(h.subdivision, (m.get(h.subdivision) || 0) + 1);
    });
    const subdivisions = [...subMap.entries()].map(([dept, subs]) => ({
      department: dept,
      values: [...subs.entries()].map(([sub, count]) => ({
        sub, count, configured: getSubdivisions(dept).includes(sub),
      })).sort((a, b) => b.count - a.count),
    }));

    // ---- status / date contradictions ----
    const completedNotFull = active.filter(p => p.status === 'Completed' && (p.progress ?? 0) < 100);
    const doneButZero = active.filter(p => p.status === 'Completed' && (p.progress ?? 0) === 0);
    const targetBeforeStart = active.filter(p => p.start_date && p.target_date && p.target_date < p.start_date);

    return NextResponse.json({
      totals: { projects: projects.length, active: active.length, archived: projects.length - active.length },
      departments: deptReport,
      unknownDepartment,
      owners: {
        distinct: ownerCounts.size,
        variantGroups,
        compound: compound.sort((a, b) => b.count - a.count),
        ambiguous: ambiguous.sort((a, b) => b.count - a.count),
        unknown: unknown.sort((a, b) => b.count - a.count).slice(0, 30),
      },
      subdivisions,
      contradictions: {
        completedNotFull: { count: completedNotFull.length, sample: completedNotFull.slice(0, 10).map(p => ({ code: p.project_code, progress: p.progress })) },
        completedAtZero: doneButZero.length,
        targetBeforeStart: { count: targetBeforeStart.length, sample: targetBeforeStart.slice(0, 10).map(p => ({ code: p.project_code, start: p.start_date, target: p.target_date })) },
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'audit failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({} as { action?: string }));
  if (body.action !== 'fix_owners') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  try {
    const client = db();
    const { projects } = await loadAll();
    const names = new Set(projects.map(p => (p.owner_name || '').trim()).filter(Boolean));

    const renamed: { from: string; to: string; rows: number }[] = [];
    for (const name of names) {
      const canonical = canonicalOwnerName(name);
      // canonicalOwnerName only returns a different string on an unambiguous
      // roster match — exactly the set that is safe to merge automatically.
      if (canonical === name) continue;
      const { data, error } = await client
        .from('projects')
        .update({ owner_name: canonical })
        .eq('owner_name', name)
        .select('id');
      if (error) throw error;
      renamed.push({ from: name, to: canonical, rows: data?.length ?? 0 });
    }

    const actor = await actorFromToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim());
    await recordAudit({
      actor,
      action: 'data.fix_owners',
      module: 'projects',
      entityType: 'project',
      entityName: `${renamed.length} owner spellings merged`,
      newValue: renamed,
      request,
    });

    return NextResponse.json({ ok: true, renamed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'fix failed' }, { status: 500 });
  }
}
