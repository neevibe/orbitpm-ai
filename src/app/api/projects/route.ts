import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fallbacks mirror src/lib/supabase.ts so the client never gets an empty URL at
// build time (createClient('') throws "supabaseUrl is required" while Next.js
// collects page data). The service-role key keeps the anon key as its only fallback.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

export async function GET() {
  try {
    // Fetch departments
    const { data: dbDepts, error: deptsErr } = await supabase.from('departments').select('*');
    if (deptsErr) throw deptsErr;

    const deptMap: Record<string, string> = {};
    dbDepts?.forEach(d => {
      deptMap[d.id] = d.name;
    });

    // Fetch projects
    const { data: dbProjects, error: projsErr } = await supabase.from('projects').select('*');
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
      archivedAt: p.archived_at || null
    }));

    // Fetch risks
    const { data: dbRisks, error: risksErr } = await supabase.from('risks').select('*');
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
  try {
    const body = await request.json();
    const { action, project, updates, originalId, splits } = body;

    // Fetch default organization ID
    const { data: orgs } = await supabase.from('organizations').select('id');
    const orgId = orgs?.[0]?.id || '11111111-1111-1111-1111-111111111111';

    // Fetch department list for mapping department name to ID
    const { data: depts } = await supabase.from('departments').select('id, name');
    const deptNameToId: Record<string, string> = {};
    depts?.forEach(d => {
      deptNameToId[d.name] = d.id;
    });

    if (action === 'create') {
      const deptId = deptNameToId[project.department] || null;
      const { error } = await supabase.from('projects').insert({
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
      });
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

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('projects').update(dbUpdates).eq('project_code', project.id);
        if (error) throw error;
      }
    } 
    else if (action === 'archive') {
      const { error } = await supabase.from('projects').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('project_code', project.id);
      if (error) throw error;
    } 
    else if (action === 'restore') {
      const { error } = await supabase.from('projects').update({
        archived: false,
        archived_at: null
      }).eq('project_code', project.id);
      if (error) throw error;
    } 
    else if (action === 'delete') {
      const { error } = await supabase.from('projects').delete().eq('project_code', project.id);
      if (error) throw error;
    } 
    else if (action === 'split') {
      // originalProject details
      const { data: dbOriginal } = await supabase.from('projects').select('*').eq('project_code', originalId).single();
      if (!dbOriginal) throw new Error('Original project not found');

      // Create new split pieces
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const newCode = `${originalId}_S${i + 1}`;
        const newName = `${dbOriginal.name} (Split ${i + 1}/${splits.length})`;
        const deptId = deptNameToId[split.department] || dbOriginal.department_id;

        const { error } = await supabase.from('projects').insert({
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
      const { error: archiveErr } = await supabase.from('projects').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('project_code', originalId);
      if (archiveErr) throw archiveErr;
    }
    else if (action === 'create_risk') {
      const { data: proj } = await supabase.from('projects').select('id').eq('project_code', project.projectId).single();
      const { error } = await supabase.from('risks').insert({
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
        const { error } = await supabase.from('risks').update(dbUpdates).eq('risk_code', project.id);
        if (error) throw error;
      }
    }
    else if (action === 'delete_risk') {
      const { error } = await supabase.from('risks').update({
        archived: true,
        archived_at: new Date().toISOString()
      }).eq('risk_code', project.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in projects mutate route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
