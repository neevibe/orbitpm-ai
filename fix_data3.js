const fs = require('fs');
const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/neerajprakash/Downloads/Antigravity Project/BIAL_Dashboard_Final_V_Final.xlsx');
const sheets = ['📋 Digital', '📋 Ops', '📋 Comm Dev', '📋 Adv', '📋 Duty Free', '📋 CBB', '📋 BASL'];

const extraDataMap = {};
sheets.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  const headerIdx = raw.findIndex(r => Object.values(r).some(v => String(v).includes('Project ID')));
  if (headerIdx === -1) return;
  
  const header = raw[headerIdx];
  const colMap = {};
  Object.keys(header).forEach(key => {
    const val = String(header[key]).trim();
    if (val.includes('Project ID')) colMap.id = key;
    if (val.includes('KPI')) colMap.kpi = key;
    if (val.includes('Notes') || val.includes('Note')) colMap.notes = key;
    if (val.includes('Dependencies')) colMap.projectDependencies = key;
    if (val.includes('Supporting Team')) colMap.supportTeam = key;
  });

  const rows = raw.slice(headerIdx + 1);
  rows.forEach(r => {
    const id = String(r[colMap.id] || '').trim();
    if (!id) return;
    
    extraDataMap[id] = {
      kpi: String(r[colMap.kpi] || '').trim(),
      notes: String(r[colMap.notes] || '').trim(),
      projectDependencies: String(r[colMap.projectDependencies] || '').trim(),
      supportTeam: String(r[colMap.supportTeam] || '').trim(),
    };
  });
});

const mockFile = fs.readFileSync('./src/lib/mock-data.ts', 'utf8');
const projectsRegex = /export const projects: Project\[\] = (\[[\s\S]*?\]);\n\nexport const risks/;
const match = mockFile.match(projectsRegex);

if (match) {
  const projectsJson = JSON.parse(match[1]);
  projectsJson.forEach(p => {
    const extra = extraDataMap[p.id] || { kpi: '', notes: '', projectDependencies: '', supportTeam: '' };
    p.kpi = extra.kpi || p.kpi || '';
    p.notes = extra.notes || p.notes || '';
    p.projectDependencies = extra.projectDependencies || p.projectDependencies || '';
    p.supportTeam = extra.supportTeam || p.supportTeam || '';
  });

  const newProjectsStr = JSON.stringify(projectsJson, null, 2);
  const newMockFile = mockFile.replace(projectsRegex, `export const projects: Project[] = ${newProjectsStr};\n\nexport const risks`);
  fs.writeFileSync('./src/lib/mock-data.ts', newMockFile);
  console.log('Fixed and populated all keys');
}
