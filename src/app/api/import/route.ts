import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const projects: any[] = [];
    const risks: any[] = [];

    // Try to find project data in any sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Find header row with "Project ID" or "Project Name"
      const headerIdx = raw.findIndex((row: any) =>
        Object.values(row).some(v => 
          String(v).includes('Project ID') || String(v).includes('Project Name')
        )
      );

      if (headerIdx >= 0) {
        const headerRow = raw[headerIdx] as Record<string, any>;
        const colKeys = Object.keys(headerRow);
        const colMap: Record<string, string> = {};

        colKeys.forEach(key => {
          const val = String(headerRow[key]).trim().toLowerCase();
          if (val.includes('project id')) colMap.id = key;
          if (val.includes('project name') || val === 'name') colMap.name = key;
          if (val.includes('department')) colMap.department = key;
          if (val.includes('owner')) colMap.owner = key;
          if (val.includes('status')) colMap.status = key;
          if (val.includes('progress')) colMap.progress = key;
          if (val.includes('priority')) colMap.priority = key;
          if (val.includes('start')) colMap.startDate = key;
          if (val.includes('target') || val.includes('end date')) colMap.targetDate = key;
          if (val.includes('risk') || val.includes('blocker')) colMap.risks = key;
          if (val.includes('objective') || val.includes('business')) colMap.objective = key;
          if (val.includes('note') || val.includes('update') || val.includes('remark')) colMap.notes = key;
        });

        if (colMap.id && colMap.name) {
          const dataRows = raw.slice(headerIdx + 1);
          dataRows.forEach((row: any) => {
            const id = String(row[colMap.id] || '').trim();
            const name = String(row[colMap.name] || '').trim();
            if (!id || !name) return;

            let progress = 0;
            const rawProgress = row[colMap.progress];
            if (rawProgress !== '' && rawProgress !== undefined) {
              const num = parseFloat(String(rawProgress).replace('%', ''));
              if (!isNaN(num)) progress = num > 1 ? Math.round(num) : Math.round(num * 100);
            }

            const parseDate = (val: any) => {
              if (!val || val === '') return null;
              if (typeof val === 'number') {
                const d = XLSX.SSF.parse_date_code(val);
                if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
              }
              return String(val);
            };

            const status = String(row[colMap.status] || 'Not Started').trim();
            const priority = String(row[colMap.priority] || 'Medium').trim();
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
          // If we got projects from Master Index, stop looking
          if (sheetName.includes('Master') && projects.length > 0) break;
        }
      }

      // Try to find risk data
      if (sheetName.toLowerCase().includes('risk')) {
        const riskHeaderIdx = raw.findIndex((row: any) =>
          Object.values(row).some(v => String(v).includes('Risk ID'))
        );
        if (riskHeaderIdx >= 0) {
          const rHeader = raw[riskHeaderIdx] as Record<string, any>;
          const rColKeys = Object.keys(rHeader);
          const rColMap: Record<string, string> = {};
          rColKeys.forEach(key => {
            const val = String(rHeader[key]).trim().toLowerCase();
            if (val.includes('risk id')) rColMap.id = key;
            if (val.includes('project id') || val.includes('linked')) rColMap.projectId = key;
            if (val.includes('description')) rColMap.description = key;
            if (val.includes('category')) rColMap.category = key;
            if (val.includes('impact')) rColMap.impact = key;
            if (val.includes('likelihood')) rColMap.likelihood = key;
            if (val.includes('score')) rColMap.score = key;
            if (val.includes('owner')) rColMap.owner = key;
            if (val.includes('mitigation')) rColMap.mitigation = key;
            if (val.includes('status')) rColMap.status = key;
            if (val.includes('target') || val.includes('due')) rColMap.targetDate = key;
          });

          raw.slice(riskHeaderIdx + 1).forEach((row: any) => {
            const id = String(row[rColMap.id] || '').trim();
            const desc = String(row[rColMap.description] || '').trim();
            if (!id || !desc) return;
            const impact = ['High', 'Medium', 'Low'].includes(String(row[rColMap.impact]).trim()) 
              ? String(row[rColMap.impact]).trim() : 'Medium';
            risks.push({
              id,
              projectId: String(row[rColMap.projectId] || '').trim(),
              description: desc,
              category: String(row[rColMap.category] || '').trim(),
              impact,
              likelihood: parseInt(row[rColMap.likelihood]) || 2,
              score: parseInt(row[rColMap.score]) || 4,
              severity: '',
              owner: String(row[rColMap.owner] || '').trim(),
              mitigation: String(row[rColMap.mitigation] || '').trim(),
              status: String(row[rColMap.status] || 'Open').trim() === 'Closed' ? 'Closed' : 'Open',
              targetDate: String(row[rColMap.targetDate] || '').trim(),
            });
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      projects,
      risks,
      summary: {
        totalProjects: projects.length,
        totalRisks: risks.length,
        departments: [...new Set(projects.map(p => p.department))].length,
        sheetsProcessed: workbook.SheetNames.length,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 500 });
  }
}
