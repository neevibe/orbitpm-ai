const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../../BIAL_Dashboard_Final_V_Final.xlsx');
const workbook = XLSX.readFile(filePath);

// ============================================
// EXTRACT ALL PROJECTS FROM MASTER INDEX
// ============================================
const masterSheet = workbook.Sheets['🔗 Master Index'];
const masterRaw = XLSX.utils.sheet_to_json(masterSheet, { defval: '' });

// Find header row (row with "Project ID")
const headerRowIdx = masterRaw.findIndex(row => 
  Object.values(row).some(v => String(v).includes('Project ID'))
);

if (headerRowIdx === -1) {
  console.error('Could not find header row in Master Index');
  process.exit(1);
}

const headerRow = masterRaw[headerRowIdx];
const colKeys = Object.keys(headerRow);
const colMap = {};
colKeys.forEach(key => {
  const val = String(headerRow[key]).trim();
  if (val.includes('Source')) colMap.source = key;
  if (val.includes('Project ID')) colMap.id = key;
  if (val.includes('Project Name')) colMap.name = key;
  if (val.includes('Department')) colMap.department = key;
  if (val.includes('Project Owner') || val.includes('Owner')) colMap.owner = key;
  if (val.includes('Current Status') || val.includes('Status')) colMap.status = key;
  if (val.includes('Progress')) colMap.progress = key;
  if (val.includes('Priority')) colMap.priority = key;
  if (val.includes('Start')) colMap.startDate = key;
  if (val.includes('Target') || val.includes('End')) colMap.targetDate = key;
  if (val.includes('Risk') || val.includes('Blocker')) colMap.risks = key;
  if (val.includes('Objective') || val.includes('Business')) colMap.objective = key;
  if (val.includes('Note') || val.includes('Update') || val.includes('Remark')) colMap.notes = key;
  if (val.includes('KPI')) colMap.kpi = key;
  if (val.includes('Supporting')) colMap.supportingTeam = key;
});

console.log('Column mapping:', colMap);
console.log('');

const dataRows = masterRaw.slice(headerRowIdx + 1);
const projects = [];

dataRows.forEach(row => {
  const id = String(row[colMap.id] || '').trim();
  const name = String(row[colMap.name] || '').trim();
  if (!id || !name || id === '' || name === '') return;
  
  // Parse progress
  let progress = 0;
  const rawProgress = row[colMap.progress];
  if (rawProgress !== '' && rawProgress !== undefined) {
    const num = parseFloat(String(rawProgress).replace('%', ''));
    if (!isNaN(num)) progress = num > 1 ? Math.round(num) : Math.round(num * 100);
  }

  // Parse dates
  const parseDate = (val) => {
    if (!val || val === '') return null;
    if (typeof val === 'number') {
      // Excel date serial
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    }
    return String(val);
  };

  const status = String(row[colMap.status] || 'Not Started').trim();
  const priority = String(row[colMap.priority] || 'Medium').trim();

  // Validate status
  const validStatuses = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];

  projects.push({
    id,
    name,
    department: String(row[colMap.department] || '').trim(),
    owner: String(row[colMap.owner] || '').trim(),
    status: validStatuses.includes(status) ? status : 'Not Started',
    progress,
    priority: validPriorities.includes(priority) ? priority : 'Medium',
    startDate: parseDate(row[colMap.startDate]),
    targetDate: parseDate(row[colMap.targetDate]),
    risks: String(row[colMap.risks] || '').trim(),
    objective: String(row[colMap.objective] || '').trim(),
    notes: String(row[colMap.notes] || '').trim(),
  });
});

console.log(`Extracted ${projects.length} projects from Master Index`);
console.log('');

// ============================================
// EXTRACT RISKS
// ============================================
const riskSheet = workbook.Sheets['🚨 Risk Register'];
const riskRaw = XLSX.utils.sheet_to_json(riskSheet, { defval: '' });

const riskHeaderIdx = riskRaw.findIndex(row =>
  Object.values(row).some(v => String(v).includes('Risk ID'))
);

let risksList = [];
if (riskHeaderIdx >= 0) {
  const riskHeader = riskRaw[riskHeaderIdx];
  const rColKeys = Object.keys(riskHeader);
  const rColMap = {};
  rColKeys.forEach(key => {
    const val = String(riskHeader[key]).trim();
    if (val.includes('Risk ID')) rColMap.id = key;
    if (val.includes('Project ID') || val.includes('Linked')) rColMap.projectId = key;
    if (val.includes('Description') || val.includes('Risk Description')) rColMap.description = key;
    if (val.includes('Category')) rColMap.category = key;
    if (val.includes('Impact')) rColMap.impact = key;
    if (val.includes('Likelihood')) rColMap.likelihood = key;
    if (val.includes('Score')) rColMap.score = key;
    if (val.includes('Owner') || val.includes('Assigned')) rColMap.owner = key;
    if (val.includes('Mitigation')) rColMap.mitigation = key;
    if (val.includes('Status')) rColMap.status = key;
    if (val.includes('Target') || val.includes('Due')) rColMap.targetDate = key;
  });

  riskRaw.slice(riskHeaderIdx + 1).forEach(row => {
    const id = String(row[rColMap.id] || '').trim();
    const desc = String(row[rColMap.description] || '').trim();
    if (!id || !desc) return;

    risksList.push({
      id,
      projectId: String(row[rColMap.projectId] || '').trim(),
      description: desc,
      category: String(row[rColMap.category] || '').trim(),
      impact: String(row[rColMap.impact] || 'Medium').trim(),
      likelihood: parseInt(row[rColMap.likelihood]) || 2,
      score: parseInt(row[rColMap.score]) || 4,
      severity: '',
      owner: String(row[rColMap.owner] || '').trim(),
      mitigation: String(row[rColMap.mitigation] || '').trim(),
      status: String(row[rColMap.status] || 'Open').trim(),
      targetDate: String(row[rColMap.targetDate] || '').trim(),
    });
  });
}

console.log(`Extracted ${risksList.length} risks from Risk Register`);

// ============================================
// GENERATE TypeScript mock-data
// ============================================
const departments = {};
projects.forEach(p => {
  if (!departments[p.department]) departments[p.department] = { total: 0, inProgress: 0, completed: 0, notStarted: 0, delayed: 0, critical: 0 };
  departments[p.department].total++;
  if (p.status === 'In Progress') departments[p.department].inProgress++;
  if (p.status === 'Completed') departments[p.department].completed++;
  if (p.status === 'Not Started') departments[p.department].notStarted++;
  if (p.status === 'Delayed') departments[p.department].delayed++;
  if (p.priority === 'Critical') departments[p.department].critical++;
});

console.log('\nDepartment Summary:');
Object.entries(departments).forEach(([name, stats]) => {
  console.log(`  ${name}: ${stats.total} projects (${stats.inProgress} active, ${stats.completed} done, ${stats.notStarted} pending, ${stats.delayed} delayed, ${stats.critical} critical)`);
});

// Write JSON for import
const output = { projects, risks: risksList, departmentStats: departments };
const outputPath = path.resolve(__dirname, '../src/lib/bial-data.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWritten to: ${outputPath}`);
console.log(`Total: ${projects.length} projects, ${risksList.length} risks`);
