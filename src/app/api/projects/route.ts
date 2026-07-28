import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordAudit, actorFromToken } from '@/lib/audit';
import { requireUser } from '@/lib/api-auth';

// Maps the mutation action to a persistent audit action + module.
const AUDIT_MAP: Record<string, { action: string; module: string; entityType: string }> = {
  create:      { action: 'project.create',  module: 'projects', entityType: 'project' },
  update:      { action: 'project.update',  module: 'projects', entityType: 'project' },
  archive:     { action: 'project.archive', module: 'projects', entityType: 'project' },
  restore:     { action: 'project.restore', module: 'projects', entityType: 'project' },
  delete:      { action: 'project.delete',  module: 'projects', entityType: 'project' },
  split:       { action: 'project.split',   module: 'projects', entityType: 'project' },
  create_risk: { action: 'risk.create',     module: 'risks',    entityType: 'risk' },
  update_risk: { action: 'risk.update',     module: 'risks',    entityType: 'risk' },
  delete_risk: { action: 'risk.delete',     module: 'risks',    entityType: 'risk' },
};

// No hardcoded fallbacks (Phase 0): the service key must come from the
// environment. getSupabase() is only called inside handlers (never at module
// scope), so a missing env fails the request with 503, not the build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a fresh client per invocation — avoids module-level state leakage across
// concurrent Vercel serverless function invocations.
function getSupabase() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}
const notConfigured = () => NextResponse.json({ error: 'Database is not configured on the server.' }, { status: 503 });

// The v2 columns (subdivision, financials, classified_dependencies) only exist
// after migration 0003 runs. Until then, writing them makes Postgres reject the
// whole statement. This detects that specific failure so we can transparently
// retry with the v2 fields stripped — existing edits never break, and the v2
// fields begin persisting automatically the moment the columns are added.
const V2_COLUMNS = ['subdivision', 'total_budget', 'utilized_budget', 'classified_dependencies', 'tasks'];
function isMissingV2Column(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return V2_COLUMNS.some(c => m.includes(c)) && (m.includes('does not exist') || m.includes('column') || m.includes('schema cache'));
}

export async function GET(request: NextRequest) {
  // Phase 0: the register is only served to authenticated users. (Phase 1
  // will additionally scope the rows by department via RLS.)
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const db = getSupabase();
  if (!db) return notConfigured();
  try {
    // Fetch departments
    const { data: dbDepts, error: deptsErr } = await db.from('departments').select('*');
    if (deptsErr) throw deptsErr;

    const deptMap: Record<string, string> = {};
    dbDepts?.forEach(d => {
      deptMap[d.id] = d.name;
    });

    // Fetch projects
    const { data: dbProjects, error: projsErr } = await db.from('projects').select('*');
    if (projsErr) throw projsErr;

    const mappedProjects = (dbProjects || []).map(p => ({
      id: p.project_code,
      name: p.name,
      department: p.department_id && deptMap[p.department_id] ? deptMap[p.department_id] : 'Unknown',
      owner: p.owner_name || '',
      status: p.status || 'Not Started',
      priority: p.priority || 'Medium',
      progress: p.progress || 0,
      startDate: p.start_date || null,
      targetDate: p.target_date || null,
      objective: p.business_objective || '',
      kpi: p.kpi || '',
      projectDependencies: p.dependencies || '',
      supportTeam: p.support_team || '',
      notes: p.notes || '',
      risks: '',
      archived: p.archived || false,
      archivedAt: p.archived_at || null,
      // v2 fields — present only after migration 0003 runs; `?? null` keeps the
      // mapping safe (and the row simply omits them while the columns are absent).
      subdivision: p.subdivision ?? null,
      totalBudget: p.total_budget ?? null,
      utilizedBudget: p.utilized_budget ?? null,
      classifiedDependencies: p.classified_dependencies ?? null,
      tasks: p.tasks ?? null
    }));

    // Fetch risks
    const { data: dbRisks, error: risksErr } = await db.from('risks').select('*');
    if (risksErr) throw risksErr;

    // Get project UUID to code mapping
    const projIdToCode: Record<string, string> = {};
    dbProjects?.forEach(p => {
      projIdToCode[p.id] = p.project_code;
    });

    const mappedRisks = (dbRisks || []).map(r => ({
      id: r.risk_code,
      projectId: r.project_id && projIdToCode[r.project_id] ? projIdToCode[r.project_id] : '',
      description: r.description,
      category: r.category || '',
      impact: r.impact || 'Low',
      likelihood: r.likelihood || 1,
      score: r.score || 1,
      severity: r.severity || 'Low',
      owner: r.owner_name || '',
      mitigation: r.mitigation || '',
      status: r.status || 'Open',
      targetDate: r.target_date || ''
    }));

    return NextResponse.json({
      success: true,
      projects: mappedProjects,
      risks: mappedRisks
    });
  } catch (error: any) {
    console.error('Error fetching database data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Phase 0: mutations require a verified session (the token was previously
  // used only for audit attribution and never checked).
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const db = getSupabase();
  if (!db) return notConfigured();
  try {
    const body = await request.json();
    const { action, project, updates, originalId, splits, audit } = body;

    console.log('[projects API] action:', action, 'project.id:', project?.id, 'updates keys:', Object.keys(updates || {}));

    // Fetch default organization ID
    const { data: orgs } = await db.from('organizations').select('id');
    const orgId = orgs?.[0]?.id || '11111111-1111-1111-1111-111111111111';

    // Fetch department list for mapping department name to ID
    const { data: depts } = await db.from('departments').select('id, name');
    const deptNameToId: Record<string, string> = {};
    depts?.forEach(d => {
      deptNameToId[d.name] = d.id;
    });

    if (action === 'create') {
      const deptId = deptNameToId[project.department] || null;
      const baseRow: any = {
        org_id: orgId,
        project_code: project.id,
        name: project.name,
        department_id: deptId,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        owner_name: project.owner || null,
        start_date: project.startDate || null,
        target_date: project.targetDate || null,
        business_objective: project.objective || null,
        kpi: project.kpi || null,
        dependencies: project.projectDependencies || null,
        support_team: project.supportTeam || null,
        notes: project.notes || null,
        archived: false
      };
      // v2 fields — included when present; stripped + retried if columns absent.
      const v2Row = {
        ...baseRow,
        subdivision: project.subdivision ?? null,
        total_budget: project.totalBudget ?? null,
        utilized_budget: project.utilizedBudget ?? null,
        classified_dependencies: project.classifiedDependencies ?? null,
        tasks: project.tasks ?? null,
      };
      let { error } = await db.from('projects').insert(v2Row);
      if (error && isMissingV2Column(error)) {
        ({ error } = await db.from('projects').insert(baseRow));
      }
      if (error) throw error;
    }
    else if (action === 'update') {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.owner !== undefined) dbUpdates.owner_name = updates.owner;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
      if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate || null;
      if (updates.objective !== undefined) dbUpdates.business_objective = updates.objective;
      if (updates.kpi !== undefined) dbUpdates.kpi = updates.kpi;
      if (updates.projectDependencies !== undefined) dbUpdates.dependencies = updates.projectDependencies;
      if (updates.supportTeam !== undefined) dbUpdates.support_team = updates.supportTeam;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.department !== undefined && deptNameToId[updates.department]) {
        dbUpdates.department_id = deptNameToId[updates.department];
      }

      // v2 fields. Kept in a separate object so that, if the columns are not yet
      // present, we can strip them and still persist the core edit.
      const v2Updates: any = {};
      if (updates.subdivision !== undefined) v2Updates.subdivision = updates.subdivision || null;
      if (updates.totalBudget !== undefined) v2Updates.total_budget = updates.totalBudget;
      if (updates.utilizedBudget !== undefined) v2Updates.utilized_budget = updates.utilizedBudget;
      if (updates.classifiedDependencies !== undefined) v2Updates.classified_dependencies = updates.classifiedDependencies;
      if (updates.tasks !== undefined) v2Updates.tasks = updates.tasks;

      const fullUpdates = { ...dbUpdates, ...v2Updates };
      if (Object.keys(fullUpdates).length > 0) {
        console.log('[projects API] updating project_code:', project.id, 'columns:', Object.keys(fullUpdates));
        let { error } = await db.from('projects').update(fullUpdates).eq('project_code', project.id);
        if (error) {
          console.error('[projects API] update error:', error.code, error.message, 'project_code:', project.id);
        }
        // If the v2 columns don't exist yet, retry with only the core fields so
        // the edit still saves (subdivision/financials persist once migrated).
        if (error && isMissingV2Column(error) && Object.keys(dbUpdates).length > 0) {
          ({ error } = await db.from('projects').update(dbUpdates).eq('project_code', project.id));
        }
        if (error && !isMissingV2Column(error)) throw error;
      }
    }
    else if (action === 'archive') {
      const { error } = await db.from('projects').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('project_code', project.id);
      if (error) throw error;
    }
    else if (action === 'restore') {
      const { error } = await db.from('projects').update({
        archived: false,
        archived_at: null
      }).eq('project_code', project.id);
      if (error) throw error;
    }
    else if (action === 'delete') {
      const { error } = await db.from('projects').delete().eq('project_code', project.id);
      if (error) throw error;
    }
    else if (action === 'split') {
      // originalProject details
      const { data: dbOriginal } = await db.from('projects').select('*').eq('project_code', originalId).single();
      if (!dbOriginal) throw new Error('Original project not found');

      // Create new split pieces
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const newCode = `${originalId}_S${i + 1}`;
        const newName = `${dbOriginal.name} (Split ${i + 1}/${splits.length})`;
        const deptId = deptNameToId[split.department] || dbOriginal.department_id;

        const { error } = await db.from('projects').insert({
          org_id: orgId,
          project_code: newCode,
          name: newName,
          department_id: deptId,
          status: 'Not Started',
          priority: dbOriginal.priority,
          progress: 0,
          owner_name: split.owner || null,
          start_date: dbOriginal.start_date,
          target_date: dbOriginal.target_date,
          business_objective: `Split ${i + 1}/${splits.length} of ${dbOriginal.name} (${split.percentage}% weight)`,
          archived: false
        });
        if (error) throw error;
      }

      // Archive original
      const { error: archiveErr } = await db.from('projects').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('project_code', originalId);
      if (archiveErr) throw archiveErr;
    }
    else if (action === 'create_risk') {
      const { data: proj } = await db.from('projects').select('id').eq('project_code', project.projectId).single();
      const { error } = await db.from('risks').insert({
        org_id: orgId,
        risk_code: project.id,
        project_id: proj?.id || null,
        description: project.description,
        category: project.category,
        impact: project.impact,
        likelihood: project.likelihood,
        score: project.score,
        severity: project.severity,
        owner_name: project.owner || null,
        mitigation: project.mitigation || null,
        status: project.status || 'Open',
        target_date: project.targetDate || null,
        archived: false
      });
      if (error) throw error;
    }
    else if (action === 'update_risk') {
      const dbUpdates: any = {};
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.impact !== undefined) dbUpdates.impact = updates.impact;
      if (updates.likelihood !== undefined) dbUpdates.likelihood = updates.likelihood;
      if (updates.score !== undefined) dbUpdates.score = updates.score;
      if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
      if (updates.owner !== undefined) dbUpdates.owner_name = updates.owner;
      if (updates.mitigation !== undefined) dbUpdates.mitigation = updates.mitigation;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate || null;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await db.from('risks').update(dbUpdates).eq('risk_code', project.id);
        if (error) throw error;
      }
    }
    else if (action === 'delete_risk') {
      const { error } = await db.from('risks').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('risk_code', project.id);
      if (error) throw error;
    }

    // ---- persistent audit trail (best-effort, never blocks the mutation) ----
    const map = AUDIT_MAP[action];
    if (map) {
      const actor = await actorFromToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim());
      const changes: Record<string, { old: unknown; new: unknown }> | undefined = audit?.changes;
      const previousValue = changes
        ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.old]))
        : null;
      const newValue = changes
        ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.new]))
        : (action === 'create' || action === 'create_risk' ? project : updates ?? null);
      await recordAudit({
        actor,
        action: map.action,
        module: map.module,
        entityType: map.entityType,
        entityId: project?.id || originalId || null,
        entityName: audit?.entityName || project?.name || project?.description || null,
        previousValue,
        newValue,
        request,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in projects mutate route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
