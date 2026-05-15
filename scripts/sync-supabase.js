require('ts-node').register({ transpileOnly: true });
const { createClient } = require('@supabase/supabase-js');
const mockData = require('../src/lib/mock-data');

const supabase = createClient('https://rfvhvpeqvuwrjcszyhbb.supabase.co', 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3');

async function sync() {
  console.log('Starting sync...');

  // 1. Get Org ID
  const { data: orgs } = await supabase.from('organizations').select('id');
  const orgId = orgs[0]?.id;
  if (!orgId) {
    console.error('No organization found');
    return;
  }

  // 2. Sync Departments
  console.log('Syncing departments...');
  const { data: existingDepts } = await supabase.from('departments').select('name');
  const existingDeptNames = existingDepts.map(d => d.name);
  
  for (const dept of mockData.departments) {
    if (!existingDeptNames.includes(dept.name)) {
      await supabase.from('departments').insert({
        org_id: orgId,
        name: dept.name,
        color: dept.color
      });
    }
  }

  // Reload departments to get UUIDs
  const { data: dbDepts } = await supabase.from('departments').select('id, name');
  const deptMap = {};
  dbDepts.forEach(d => deptMap[d.name] = d.id);

  // 3. Clear existing projects/risks to avoid duplicates
  console.log('Clearing existing sample projects...');
  await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // deletes all

  // 4. Sync Projects
  console.log(`Syncing ${mockData.projects.length} projects...`);
  const projectInserts = mockData.projects.map(p => ({
    org_id: orgId,
    department_id: deptMap[p.department],
    project_code: p.id,
    name: p.name,
    status: p.status,
    priority: p.priority,
    progress: p.progress,
    owner_name: p.owner,
    start_date: p.startDate || null,
    target_date: p.targetDate || null,
    business_objective: p.objective || null,
    kpi: p.kpi || null,
    dependencies: p.projectDependencies || null,
    support_team: p.supportTeam || null,
    notes: p.notes || null,
    archived: p.archived || false,
    archived_at: p.archivedAt || null
  }));

  // Chunk inserts for projects
  for (let i = 0; i < projectInserts.length; i += 50) {
    const chunk = projectInserts.slice(i, i + 50);
    const { error } = await supabase.from('projects').insert(chunk);
    if (error) console.error('Project insert error:', error.message);
  }

  // Reload projects to get UUIDs
  const { data: dbProjs } = await supabase.from('projects').select('id, project_code');
  const projMap = {};
  dbProjs.forEach(p => projMap[p.project_code] = p.id);

  // 5. Sync Risks
  console.log(`Syncing ${mockData.risks.length} risks...`);
  const riskInserts = mockData.risks.map(r => ({
    org_id: orgId,
    project_id: projMap[r.projectId],
    risk_code: r.id,
    description: r.description,
    category: r.category,
    impact: r.impact,
    likelihood: r.likelihood,
    score: r.score,
    severity: r.severity,
    owner_name: r.owner,
    mitigation: r.mitigation,
    status: r.status,
    target_date: r.targetDate || null
  }));

  if (riskInserts.length > 0) {
    const { error } = await supabase.from('risks').insert(riskInserts);
    if (error) console.error('Risk insert error:', error.message);
  }

  console.log('Sync complete!');
}

sync();
