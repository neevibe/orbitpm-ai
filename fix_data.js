const fs = require('fs');
const XLSX = require('xlsx');

// 1. Read Excel file
const workbook = XLSX.readFile('/Users/neerajprakash/Downloads/Antigravity Project/BIAL_Dashboard_Final_V_Final.xlsx');
const sheets = ['📋 Digital', '📋 Ops', '📋 Comm Dev', '📋 Adv', '📋 Duty Free', '📋 CBB', '📋 BASL'];

const extraDataMap = {};

sheets.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  // Find header row
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

console.log(`Found extra data for ${Object.keys(extraDataMap).length} projects.`);

// 2. Read mock-data.ts
const mockFile = fs.readFileSync('./src/lib/mock-data.ts', 'utf8');

// The file format is basically:
// ... interfaces ...
// export const projects: Project[] = [ ... ];
// export const risks: Risk[] = [ ... ];
// export const departments: Department[] = [ ... ];

const projectsRegex = /export const projects: Project\[\] = (\[[\s\S]*?\]);\n\nexport const risks/;
const match = mockFile.match(projectsRegex);

if (!match) {
  console.log("Could not parse projects from mock-data.ts");
  process.exit(1);
}

const projectsJson = JSON.parse(match[1]);
let updatedCount = 0;

projectsJson.forEach(p => {
  const extra = extraDataMap[p.id];
  if (extra) {
    if (extra.kpi) p.kpi = extra.kpi;
    if (extra.notes) p.notes = extra.notes;
    if (extra.projectDependencies) p.projectDependencies = extra.projectDependencies;
    if (extra.supportTeam) p.supportTeam = extra.supportTeam;
    updatedCount++;
  }
});

const newProjectsStr = JSON.stringify(projectsJson, null, 2);
const newMockFile = mockFile.replace(projectsRegex, `export const projects: Project[] = ${newProjectsStr};\n\nexport const risks`);

fs.writeFileSync('./src/lib/mock-data.ts', newMockFile);
console.log(`Updated mock-data.ts with KPI/Notes for ${updatedCount} projects.`);

