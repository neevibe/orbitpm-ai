const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://rfvhvpeqvuwrjcszyhbb.supabase.co', 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3');

async function run() {
  console.log('Reading Excel...');
  const workbook = XLSX.readFile('/Users/neerajprakash/Downloads/Antigravity Project/BIAL_Dashboard_Final_V_Final.xlsx');
  const sheet = workbook.Sheets['📋 CBB'];
  if (!sheet) {
    console.error('Sheet 📋 CBB not found');
    return;
  }
  
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  const headerIdx = raw.findIndex(r => Object.values(r).some(v => String(v).includes('Project ID')));
  if (headerIdx === -1) {
    console.error('Header row not found');
    return;
  }
  
  const header = raw[headerIdx];
  const colMap = {};
  Object.keys(header).forEach(key => {
    const val = String(header[key]).trim();
    if (val.includes('Project ID')) colMap.id = key;
    if (val.includes('Project Name')) colMap.name = key;
    if (val.includes('Project Owner') || val.includes('Owner')) colMap.owner = key;
    if (val.includes('Current Status') || val.includes('Status')) colMap.status = key;
    if (val.includes('Progress')) colMap.progress = key;
    if (val.includes('Priority')) colMap.priority = key;
    if (val.includes('Start')) colMap.startDate = key;
    if (val.includes('Target') || val.includes('End')) colMap.targetDate = key;
    if (val.includes('Risk') || val.includes('Blocker')) colMap.risks = key;
    if (val.includes('Objective') || val.includes('Business')) colMap.objective = key;
    if (val.includes('KPI')) colMap.kpi = key;
    if (val.includes('Dependencies')) colMap.projectDependencies = key;
    if (val.includes('Supporting Team')) colMap.supportTeam = key;
    if (val.includes('Notes') || val.includes('Note')) colMap.notes = key;
  });

  const parseDate = (val) => {
    if (!val || val === '') return null;
    if (typeof val === 'number') {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    }
    return String(val);
  };

  const rows = raw.slice(headerIdx + 1).filter(r => String(r[colMap.id] || '').trim() !== '');
  
  console.log(`Found ${rows.length} projects in CBB.`);

  // Get department ID
  const { data: depts } = await supabase.from('departments').select('id, name');
  const cbbDept = depts.find(d => d.name === 'CBB & Lounge' || d.name.includes('CBB'));
  if (!cbbDept) {
    console.error('CBB department not found in DB');
    return;
  }
  
  for (const r of rows) {
    const id = String(r[colMap.id]).trim();
    const progressRaw = r[colMap.progress];
    let progress = 0;
    if (progressRaw !== '' && progressRaw !== undefined) {
      const num = parseFloat(String(progressRaw).replace('%', ''));
      if (!isNaN(num)) progress = num > 1 ? Math.round(num) : Math.round(num * 100);
    }
    
    const updateData = {
      name: String(r[colMap.name] || '').trim(),
      owner_name: String(r[colMap.owner] || '').trim(),
      status: String(r[colMap.status] || 'Not Started').trim(),
      progress,
      priority: String(r[colMap.priority] || 'Medium').trim(),
      start_date: parseDate(r[colMap.startDate]),
      target_date: parseDate(r[colMap.targetDate]),
      business_objective: String(r[colMap.objective] || '').trim(),
      kpi: String(r[colMap.kpi] || '').trim(),
      dependencies: String(r[colMap.projectDependencies] || '').trim(),
      support_team: String(r[colMap.supportTeam] || '').trim(),
      notes: String(r[colMap.notes] || '').trim()
    };
    
    const { error } = await supabase.from('projects')
      .update(updateData)
      .eq('project_code', id);
      
    if (error) {
      console.error(`Error updating ${id}:`, error.message);
    } else {
      console.log(`Updated ${id}`);
    }
  }
  console.log('Finished updating CBB projects.');
}

run();
