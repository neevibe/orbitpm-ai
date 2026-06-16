import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const EXCEL_PATHS = [
  '/Users/neerajprakash/Downloads/Antigravity Project/BIAL_Dashboard_Final_V_Final.xlsx',
  '/Users/neerajprakash/Downloads/BIAL_Dashboard_Final_V_Final_edit.xlsx'
];

function getSheetName(dept: string): string {
  const d = dept.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (d.includes('digital')) return '📋 Digital';
  if (d.includes('operation') || d === 'ops') return '📋 Ops';
  if (d.includes('commercialdevelopment') || d.includes('commdev')) return '📋 Comm Dev';
  if (d.includes('advertising') || d.includes('advertisment') || d === 'adv') return '📋 Adv';
  if (d.includes('dutyfree') || d.includes('retail')) return '📋 Duty Free';
  if (d.includes('cbb') || d.includes('amenities')) return '📋 CBB';
  if (d.includes('basl') || d.includes('strategic')) return '📋 BASL';
  return '📋 Ops';
}

export async function POST(request: NextRequest) {
  try {
    const { action, project } = await request.json();

    if (!action || !project || !project.id) {
      return NextResponse.json({ error: 'Missing action or project data' }, { status: 400 });
    }

    let updatedFilesCount = 0;

    for (const filePath of EXCEL_PATHS) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const wb = XLSX.readFile(filePath, { cellDates: true });
      const sheetName = getSheetName(project.department);
      const ws = wb.Sheets[sheetName];

      if (!ws) {
        console.error(`Sheet not found: ${sheetName} in ${filePath}`);
        continue;
      }

      // Read sheet as 2D array
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      
      // Find header row containing "Project ID"
      const hi = rows.findIndex(r => r.some(v => String(v).toLowerCase().includes('project id')));
      if (hi === -1) {
        console.error(`Header row not found in ${sheetName} of ${filePath}`);
        continue;
      }

      const header = rows[hi];
      const colMap: Record<string, number> = {};
      header.forEach((h, i) => {
        const t = String(h).toLowerCase();
        if (t.includes('project id')) colMap.id = i;
        else if (t.includes('project name') || t === 'name') colMap.name = i;
        else if (t.includes('department')) colMap.dept = i;
        else if (t.includes('owner')) colMap.owner = i;
        else if (t.includes('status')) colMap.status = i;
        else if (t.includes('progress')) colMap.progress = i;
        else if (t.includes('priority')) colMap.priority = i;
        else if (t.includes('start')) colMap.start = i;
        else if (t.includes('target') || t.includes('end')) colMap.target = i;
        else if (t.includes('objective')) colMap.objective = i;
        else if (t.includes('dependenc')) colMap.deps = i;
        else if (t.includes('kpi')) colMap.kpi = i;
        else if (t.includes('support')) colMap.support = i;
        else if (t.includes('notes')) colMap.notes = i;
      });

      // Find the row index of the project
      const projectRowIdx = rows.findIndex((r, idx) => idx > hi && String(r[colMap.id] ?? '').trim().toLowerCase() === project.id.toLowerCase());

      const progressVal = typeof project.progress === 'number' ? project.progress / 100 : 0;

      if (action === 'delete') {
        if (projectRowIdx !== -1) {
          rows.splice(projectRowIdx, 1);
        }
      } else if (action === 'update' || action === 'create') {
        const rowData = projectRowIdx !== -1 ? rows[projectRowIdx] : new Array(header.length).fill('');
        
        if (colMap.id !== undefined) rowData[colMap.id] = project.id;
        if (colMap.name !== undefined) rowData[colMap.name] = project.name;
        if (colMap.dept !== undefined) rowData[colMap.dept] = project.department;
        if (colMap.owner !== undefined) rowData[colMap.owner] = project.owner;
        if (colMap.status !== undefined) rowData[colMap.status] = project.status;
        if (colMap.progress !== undefined) rowData[colMap.progress] = progressVal;
        if (colMap.priority !== undefined) rowData[colMap.priority] = project.priority;
        if (colMap.start !== undefined) rowData[colMap.start] = project.startDate || '';
        if (colMap.target !== undefined) rowData[colMap.target] = project.targetDate || '';
        if (colMap.risks !== undefined) rowData[colMap.risks] = project.risks || '';
        if (colMap.objective !== undefined) rowData[colMap.objective] = project.objective || '';
        if (colMap.deps !== undefined) rowData[colMap.deps] = project.projectDependencies || '';
        if (colMap.kpi !== undefined) rowData[colMap.kpi] = project.kpi || '';
        if (colMap.support !== undefined) rowData[colMap.support] = project.supportTeam || '';
        if (colMap.notes !== undefined) rowData[colMap.notes] = project.notes || '';

        if (projectRowIdx === -1) {
          rows.push(rowData);
        }
      }

      // Convert back to sheet and write
      const newWs = XLSX.utils.aoa_to_sheet(rows);
      wb.Sheets[sheetName] = newWs;
      XLSX.writeFile(wb, filePath);
      updatedFilesCount++;
    }

    return NextResponse.json({ success: true, updatedFilesCount });
  } catch (error: any) {
    console.error('Error syncing local Excel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
