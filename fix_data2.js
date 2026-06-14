const fs = require('fs');
const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/neerajprakash/Downloads/Antigravity Project/BIAL_Dashboard_Final_V_Final.xlsx');
const sheets = ['📋 Digital', '📋 Ops', '📋 Comm Dev', '📋 Adv', '📋 Duty Free', '📋 CBB', '📋 BASL'];

let found = null;
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
    if (r[colMap.id] === 'PRDIGI_01') {
      found = {
        id: r[colMap.id],
        kpi: r[colMap.kpi],
        notes: r[colMap.notes],
        projectDependencies: r[colMap.projectDependencies],
        supportTeam: r[colMap.supportTeam]
      };
      console.log('Cols:', colMap);
    }
  });
});
console.log('Found PRDIGI_01:', found);
