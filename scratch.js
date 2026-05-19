const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/neerajprakash/Downloads/Antigravity Project/BIAL_Dashboard_Final_V_Final.xlsx');
const sheet = workbook.Sheets['📋 Digital'];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<4; i++) {
  console.log('Row', i, raw[i]);
}
