import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { projects, risks, departments } = data;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // ============================================
    // Sheet 1: Dashboard Summary
    // ============================================
    const totalProjects = projects.length;
    const inProgress = projects.filter((p: any) => p.status === 'In Progress').length;
    const completed = projects.filter((p: any) => p.status === 'Completed').length;
    const delayed = projects.filter((p: any) => p.status === 'Delayed').length;
    const notStarted = projects.filter((p: any) => p.status === 'Not Started').length;
    const critical = projects.filter((p: any) => p.priority === 'Critical').length;

    const dashboardData = [
      ['XYRENIS COMMERCIAL DEPARTMENT · Project Governance Dashboard'],
      [`Generated from Xyrenis Work OS · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`],
      [''],
      ['KPI', 'Value'],
      ['Total Projects', totalProjects],
      ['In Progress', inProgress],
      ['Completed', completed],
      ['Delayed', delayed],
      ['Not Started', notStarted],
      ['Critical Priority', critical],
      [''],
      ['Department', 'Total', 'In Progress', 'Completed', 'Not Started', 'Delayed', 'Critical', '% Done'],
      ...departments.map((d: any) => [
        d.name, d.total, d.inProgress, d.completed, d.notStarted, d.delayed, d.critical,
        `${d.pctDone}%`,
      ]),
      ['Grand Total', totalProjects, inProgress, completed, notStarted, delayed, critical,
        `${totalProjects > 0 ? Math.round((completed / totalProjects) * 100) : 0}%`],
    ];
    const dashSheet = XLSX.utils.aoa_to_sheet(dashboardData);
    dashSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, dashSheet, 'Dashboard');

    // ============================================
    // Sheet 2: Master Project Index
    // ============================================
    const projectHeaders = [
      'Project ID', 'Project Name', 'Department', 'Project Owner', 'Status',
      'Progress %', 'Priority', 'Start Date', 'Target Date', 'Key Risks/Blockers',
      'Business Objective', 'Notes',
    ];
    const projectRows = projects.map((p: any) => [
      p.id, p.name, p.department, p.owner, p.status,
      p.progress, p.priority, p.startDate || '', p.targetDate || '',
      p.risks || '', p.objective || '', p.notes || '',
    ]);
    const projectSheet = XLSX.utils.aoa_to_sheet([projectHeaders, ...projectRows]);
    projectSheet['!cols'] = [
      { wch: 14 }, { wch: 45 }, { wch: 24 }, { wch: 25 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 40 },
      { wch: 40 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, projectSheet, 'Master Index');

    // ============================================
    // Sheet 3: Risk Register
    // ============================================
    const riskHeaders = [
      'Risk ID', 'Project ID', 'Description', 'Category', 'Impact',
      'Likelihood', 'Score', 'Owner', 'Mitigation', 'Status', 'Target Date',
    ];
    const riskRows = risks.map((r: any) => [
      r.id, r.projectId, r.description, r.category, r.impact,
      r.likelihood, r.score, r.owner, r.mitigation, r.status, r.targetDate || '',
    ]);
    const riskSheet = XLSX.utils.aoa_to_sheet([riskHeaders, ...riskRows]);
    riskSheet['!cols'] = [
      { wch: 10 }, { wch: 14 }, { wch: 50 }, { wch: 18 }, { wch: 10 },
      { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 50 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, riskSheet, 'Risk Register');

    // ============================================
    // Per-department sheets
    // ============================================
    const deptNames = [...new Set(projects.map((p: any) => p.department))] as string[];
    deptNames.forEach((deptName: string) => {
      const deptProjects = projects.filter((p: any) => p.department === deptName);
      const deptRows = deptProjects.map((p: any) => [
        p.id, p.name, p.owner, p.status, p.progress,
        p.priority, p.startDate || '', p.targetDate || '',
        p.risks || '', p.objective || '', p.notes || '',
      ]);
      const deptHeaders = ['Project ID', 'Project Name', 'Owner', 'Status', 'Progress %',
        'Priority', 'Start Date', 'Target Date', 'Risks', 'Objective', 'Notes'];
      const deptSheet = XLSX.utils.aoa_to_sheet([deptHeaders, ...deptRows]);
      deptSheet['!cols'] = [
        { wch: 14 }, { wch: 45 }, { wch: 25 }, { wch: 14 }, { wch: 10 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
      ];
      // Shorten sheet name to max 31 chars (Excel limit)
      const sheetName = deptName.length > 28 ? deptName.substring(0, 28) + '...' : deptName;
      XLSX.utils.book_append_sheet(wb, deptSheet, sheetName);
    });

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Xyrenis_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
