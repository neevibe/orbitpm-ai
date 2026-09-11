'use client';

import { useData } from '@/lib/data-context';
import { Calendar, Download, Eye, X, Zap } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import React, { useState } from 'react';
import { Project } from '@/lib/mock-data';
import QuickEditPanel from '@/components/project/QuickEditPanel';
import { STATUS_COLORS, HEALTH_COLORS, AXIS_TICK, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, BAR } from '@/lib/chart-theme';
import { usePresence, OwnerAvatar, ShareToTeamsButton, emailForName as ownerEmail } from '@/components/collab/TeamsCollab';
import ActivityFeed from '@/components/collab/ActivityFeed';
import ExecutiveBrief from '@/components/dashboard/command/ExecutiveBrief';
import MetricRail, { type Metric } from '@/components/dashboard/command/MetricRail';
import PortfolioMeter from '@/components/dashboard/command/PortfolioMeter';
import AttentionRegister, { type AttentionRow } from '@/components/dashboard/command/AttentionRegister';
import { plural } from '@/lib/utils';


function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function CommandCenter() {
  const { projects, risks, departments, liveStatus, scope, orgStats } = useData();
  const [activeFilter, setActiveFilter] = useState<{
    type: 'status' | 'priority' | 'department' | 'health' | 'kpi' | 'ai';
    label: string;
    filterFn: (p: Project) => boolean;
  } | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const openPanel = (p: Project) => setSelectedProject(p);

  // Base list of active (non-archived) projects
  const activeProjects = React.useMemo(() => projects.filter(p => !p.archived), [projects]);

  // Derived filtered projects list based on the active filter
  const filteredProjects = React.useMemo(() => {
    if (!activeFilter) return activeProjects;
    return activeProjects.filter(activeFilter.filterFn);
  }, [activeProjects, activeFilter]);

  // Compute metrics based on filtered projects
  const pctComplete = filteredProjects.length > 0
    ? Math.round((filteredProjects.filter(p => p.status === 'Completed').length / filteredProjects.length) * 100)
    : 0;

  // Filtered open risks associated with the filtered projects
  const highRisks = React.useMemo(() => {
    return risks.filter(r => r.impact === 'High' && r.status === 'Open' && filteredProjects.some(p => p.id === r.projectId));
  }, [risks, filteredProjects]);

  // Owner workload computed from filtered projects
  const ownerCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProjects.filter(p => p.status === 'In Progress').forEach(p => {
      counts[p.owner] = (counts[p.owner] || 0) + 1;
    });
    return counts;
  }, [filteredProjects]);

  const overloaded = React.useMemo(() => {
    return Object.entries(ownerCounts)
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1]);
  }, [ownerCounts]);

  // Health filters map
  const healthFilters = React.useMemo(() => ({
    'On Track': (p: Project) => p.status !== 'Delayed' && p.status !== 'On Hold' && !risks.some(r => r.projectId === p.id && r.status === 'Open'),
    'At Risk': (p: Project) => p.status === 'On Hold' || risks.some(r => r.projectId === p.id && r.status === 'Open'),
    'Delayed': (p: Project) => p.status === 'Delayed'
  }), [risks]);

  // Local dynamically computed KPIs for KPI cards
  const localKpi = React.useMemo(() => {
    // If filtering by KPI card, keep metrics showing overall portfolio metrics or filtered
    const sourceProjects = activeFilter?.type === 'kpi' ? activeProjects : filteredProjects;

    const totalProjects = sourceProjects.length;
    const inProgress = sourceProjects.filter(p => p.status === 'In Progress').length;
    const completed = sourceProjects.filter(p => p.status === 'Completed').length;
    const delayed = sourceProjects.filter(p => p.status === 'Delayed').length;
    const notStarted = sourceProjects.filter(p => p.status === 'Not Started').length;
    const onHold = sourceProjects.filter(p => p.status === 'On Hold').length;

    const critical = sourceProjects.filter(p => p.priority === 'Critical').length;
    const high = sourceProjects.filter(p => p.priority === 'High').length;
    const medium = sourceProjects.filter(p => p.priority === 'Medium').length;
    const low = sourceProjects.filter(p => p.priority === 'Low').length;

    const openRisks = risks.filter(r => r.status === 'Open' && sourceProjects.some(p => p.id === r.projectId)).length;

    const stuckProjects = sourceProjects.filter(p => {
      if (p.status === 'Completed' || p.dismissedFromStuck) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      const isDelayed = p.status === 'Delayed';
      const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
      return isDelayed || isOverdue;
    }).length;

    return {
      totalProjects,
      inProgress,
      completed,
      delayed,
      notStarted,
      onHold,
      critical,
      high,
      medium,
      low,
      openRisks,
      stuckProjects
    };
  }, [activeProjects, filteredProjects, risks, activeFilter]);

  // Portfolio Health calculations
  const healthData = React.useMemo(() => {
    const sourceProjects = activeFilter?.type === 'health' ? activeProjects : filteredProjects;
    let onTrack = 0;
    let atRisk = 0;
    let delayed = 0;

    sourceProjects.forEach(p => {
      const hasOpenRisks = risks.some(r => r.projectId === p.id && r.status === 'Open');
      if (p.status === 'Delayed') {
        delayed++;
      } else if (p.status === 'On Hold' || hasOpenRisks) {
        atRisk++;
      } else {
        onTrack++;
      }
    });

    return [
      { name: 'On Track', value: onTrack, color: HEALTH_COLORS.onTrack },
      { name: 'At Risk', value: atRisk, color: HEALTH_COLORS.atRisk },
      { name: 'Delayed', value: delayed, color: HEALTH_COLORS.delayed },
    ].filter(d => d.value > 0);
  }, [activeProjects, filteredProjects, risks, activeFilter]);

  // Department chart
  const deptChartData = React.useMemo(() => {
    const sourceProjects = activeFilter?.type === 'department' ? activeProjects : filteredProjects;
    return departments.slice(0, 7).map(d => {
      const deptProjects = sourceProjects.filter(p => p.department === d.name);
      return {
        name: d.name,
        fullName: d.name,
        active: deptProjects.filter(p => p.status === 'In Progress').length,
        done: deptProjects.filter(p => p.status === 'Completed').length,
        delayed: deptProjects.filter(p => p.status === 'Delayed').length,
        pending: deptProjects.filter(p => p.status === 'Not Started' || p.status === 'On Hold').length,
        total: deptProjects.length,
      };
    });
  }, [departments, activeProjects, filteredProjects, activeFilter]);

  // Status distribution data for vertical BarChart
  const statusDistributionData = React.useMemo(() => {
    const sourceProjects = activeFilter?.type === 'status' ? activeProjects : filteredProjects;
    return [
      { name: 'Not Started', count: sourceProjects.filter(p => p.status === 'Not Started').length, color: STATUS_COLORS['Not Started'] },
      { name: 'In Progress', count: sourceProjects.filter(p => p.status === 'In Progress').length, color: STATUS_COLORS['In Progress'] },
      { name: 'On Hold', count: sourceProjects.filter(p => p.status === 'On Hold').length, color: STATUS_COLORS['On Hold'] },
      { name: 'Delayed', count: sourceProjects.filter(p => p.status === 'Delayed').length, color: STATUS_COLORS['Delayed'] },
      { name: 'Completed', count: sourceProjects.filter(p => p.status === 'Completed').length, color: STATUS_COLORS['Completed'] },
    ];
  }, [activeProjects, filteredProjects, activeFilter]);

  // AI insights
  const aiInsights = React.useMemo(() => {
    const items: {
      severity: 'critical' | 'warning' | 'info' | 'success';
      title: string;
      desc: string;
      filterFn: (p: Project) => boolean;
    }[] = [];

    if (localKpi.stuckProjects > 0) {
      items.push({
        severity: 'critical',
        title: `${localKpi.stuckProjects} high-priority projects stuck`,
        desc: 'Timeline slip or overdue target date detected',
        filterFn: (p: Project) => {
          if (p.status === 'Completed' || p.archived || p.dismissedFromStuck) return false;
          const todayStr = new Date().toISOString().split('T')[0];
          const isDelayed = p.status === 'Delayed';
          const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
          return isDelayed || isOverdue;
        }
      });
    }

    if (localKpi.delayed > 0) {
      items.push({
        severity: 'warning',
        title: `${localKpi.delayed} project${localKpi.delayed > 1 ? 's' : ''} delayed`,
        desc: 'Timeline slippage detected across portfolio',
        filterFn: (p: Project) => p.status === 'Delayed'
      });
    }

    if (overloaded.length > 0) {
      items.push({
        severity: 'warning',
        title: `${overloaded.length} team member${overloaded.length > 1 ? 's' : ''} overloaded`,
        desc: `${overloaded[0]?.[0]} carrying ${overloaded[0]?.[1]} active projects`,
        filterFn: (p: Project) => p.owner === overloaded[0]?.[0]
      });
    }

    if (highRisks.length > 0) {
      items.push({
        severity: 'critical',
        title: `${highRisks.length} high-impact risks open`,
        desc: 'Escalation review recommended this week',
        filterFn: (p: Project) => risks.some(r => r.projectId === p.id && r.status === 'Open' && r.impact === 'High')
      });
    }

    if (pctComplete > 10) {
      items.push({
        severity: 'success',
        title: `${pctComplete}% portfolio completion`,
        desc: `${localKpi.completed} projects delivered successfully`,
        filterFn: (p: Project) => p.status === 'Completed'
      });
    }

    if (items.length === 0) {
      items.push({
        severity: 'info',
        title: 'All systems operational',
        desc: 'No critical alerts at this time',
        filterFn: () => true
      });
    }
    return items;
  }, [localKpi, overloaded, highRisks, pctComplete, risks]);

  // ── Attention register ────────────────────────────────────────────────────
  // Everything that needs a human decision, ranked. Delay outranks risk
  // outranks stall, and within delay the longest overrun comes first — the
  // order a portfolio review actually works through.
  const attentionRows = React.useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];
    filteredProjects.forEach(p => {
      if (p.status === 'Completed' || p.dismissedFromStuck) return;
      const late = daysUntil(p.targetDate);
      const daysLate = late !== null && late < 0 ? Math.abs(late) : 0;
      const openRisks = risks.filter(r => r.projectId === p.id && r.status === 'Open' && r.impact === 'High').length;
      if (daysLate > 0 || p.status === 'Delayed') {
        rows.push({ project: p, daysLate, risks: openRisks, band: 'delayed' });
      } else if (openRisks > 0 || p.status === 'On Hold') {
        rows.push({ project: p, daysLate: 0, risks: openRisks, band: 'at-risk' });
      } else if (p.status === 'In Progress' && (p.progress ?? 0) === 0) {
        rows.push({ project: p, daysLate: 0, risks: 0, band: 'stalled' });
      }
    });
    const rank = { delayed: 0, 'at-risk': 1, stalled: 2 } as const;
    return rows.sort((a, b) => rank[a.band] - rank[b.band] || b.daysLate - a.daysLate || b.risks - a.risks);
  }, [filteredProjects, risks]);

  // Live Teams presence for the owners actually on screen (renders only when
  // the viewer has connected Microsoft — no fabricated dots).
  const { presence } = usePresence(React.useMemo(
    () => attentionRows.slice(0, 14).map(r => r.project.owner),
    [attentionRows],
  ));

  // ── Briefing ──────────────────────────────────────────────────────────────
  // Reuses the existing aiInsights signals; the difference is presentation and
  // ranking, not fabricated intelligence.
  const briefSignals = React.useMemo(() => {
    const order = { critical: 0, warning: 1, info: 2, success: 3 } as const;
    return [...aiInsights]
      .sort((a, b) => order[a.severity] - order[b.severity])
      .filter(s => s.severity !== 'success')
      .map(s => ({
        severity: (s.severity === 'info' ? 'info' : s.severity) as 'critical' | 'warning' | 'info',
        title: s.title,
        detail: s.desc,
        count: activeProjects.filter(s.filterFn).length,
        onView: () => setActiveFilter({ type: 'ai', label: s.title, filterFn: s.filterFn }),
      }));
  }, [aiInsights, activeProjects]);

  const tooltipCommon = { contentStyle: TOOLTIP_STYLE, labelStyle: TOOLTIP_LABEL_STYLE, itemStyle: TOOLTIP_ITEM_STYLE };

  const useOrg = !!(scope && !scope.admin && orgStats);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = useOrg ? orgStats!.newThisMonth : activeProjects.filter(p => p.startDate?.startsWith(thisMonth)).length;
  const dueSoon = useOrg ? orgStats!.dueSoon : activeProjects.filter(p => {
    if (p.status === 'Completed') return false;
    const d = daysUntil(p.targetDate);
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const stalled = useOrg ? orgStats!.stalled : activeProjects.filter(p => p.status === 'In Progress' && p.progress === 0).length;
  const k = useOrg
    ? { totalProjects: orgStats!.totalProjects, inProgress: orgStats!.inProgress, completed: orgStats!.completed, delayed: orgStats!.delayed }
    : localKpi;
  const kOpenRisks = useOrg ? orgStats!.openRisks : localKpi.openRisks;
  const kHighRisks = useOrg ? orgStats!.highImpactRisks : highRisks.length;
  const kPctComplete = useOrg && k.totalProjects ? Math.round((k.completed / k.totalProjects) * 100) : pctComplete;

  const setKpiFilter = (label: string, filterFn: (p: Project) => boolean) => {
    setActiveFilter(prev =>
      prev?.type === 'kpi' && prev.label === label ? null : { type: 'kpi', label, filterFn });
  };

  const metrics: Metric[] = [
    { label: 'Projects', value: k.totalProjects, note: newThisMonth > 0 ? `+${newThisMonth} this month` : 'no new this month', tone: newThisMonth > 0 ? 'up' : 'flat' },
    { label: 'Active', value: k.inProgress, note: dueSoon > 0 ? `${dueSoon} due in 7d` : 'none due in 7d', tone: dueSoon > 0 ? 'warn' : 'flat',
      onSelect: () => setKpiFilter('Active', p => p.status === 'In Progress'), selected: activeFilter?.label === 'Active' },
    { label: 'Delayed', value: k.delayed, note: k.delayed > 0 ? `${Math.round((k.delayed / (k.totalProjects || 1)) * 100)}% of portfolio` : 'all on schedule', tone: k.delayed > 0 ? 'down' : 'up',
      onSelect: () => setKpiFilter('Delayed', p => p.status === 'Delayed'), selected: activeFilter?.label === 'Delayed' },
    { label: 'Completed', value: k.completed, note: `${kPctComplete}% of portfolio`, tone: 'flat',
      onSelect: () => setKpiFilter('Completed', p => p.status === 'Completed'), selected: activeFilter?.label === 'Completed' },
    { label: 'Stalled', value: stalled, note: stalled > 0 ? 'at 0% progress' : 'none stalled', tone: stalled > 0 ? 'warn' : 'flat',
      onSelect: () => setKpiFilter('Stalled', p => p.status === 'In Progress' && p.progress === 0), selected: activeFilter?.label === 'Stalled' },
    { label: 'Open risks', value: kOpenRisks, note: kHighRisks > 0 ? `${kHighRisks} high impact` : 'low exposure', tone: kHighRisks > 0 ? 'down' : 'flat',
      onSelect: () => setKpiFilter('Open risks', p => risks.some(r => r.projectId === p.id && r.status === 'Open')), selected: activeFilter?.label === 'Open risks' },
  ];

  return (
    <div className="x-page x-bands">
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="x-page-title">Command Center</h1>
          <p className="x-page-subtitle">
            Commercial portfolio
            <span className="mx-1.5 text-[var(--color-x-text-faint)]">·</span>
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4 no-print">
          {scope && liveStatus === 'live' && (
            <span
              title={scope.admin
                ? 'Admin view — every department is visible'
                : 'Departmental privacy is on: you see your department plus projects that depend on it'}
              className="hidden md:flex items-center gap-1.5 text-[11.5px] text-[var(--color-x-text-muted)]"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              {scope.admin ? 'All departments' : `${scope.department || 'No department'}${scope.shared ? ` +${scope.shared} shared` : ''}`}
            </span>
          )}
          {liveStatus === 'live' ? (
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-x-text-muted)]" title="Data is live from the server">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-success)]" aria-hidden="true" /> Live
            </span>
          ) : liveStatus === 'error' ? (
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--color-x-danger)]" title="The server refresh failed — these numbers are an offline copy.">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-danger)]" aria-hidden="true" /> Offline copy
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-x-text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-warning)] animate-pulse" aria-hidden="true" /> Loading
            </span>
          )}
          <button onClick={() => window.print()} className="x-btn x-btn-ghost text-[12px] px-2.5 py-1.5 inline-flex items-center gap-1.5" title="Export this view as PDF">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export
          </button>
        </div>
      </header>

      {/* ── Active filter ────────────────────────────────────────────────── */}
      {activeFilter && (
        <div className="flex items-center gap-3 -mt-4 no-print">
          <span className="text-[12.5px] text-[var(--color-x-text-secondary)]">
            Filtered to <strong className="text-[var(--color-x-text)]">{activeFilter.label}</strong>
            <span className="text-[var(--color-x-text-muted)]"> — {plural(filteredProjects.length, 'project')} of {activeProjects.length}</span>
          </span>
          <button onClick={() => setActiveFilter(null)} className="text-[12px] font-medium text-[var(--color-x-accent)] inline-flex items-center gap-1 hover:underline cursor-pointer">
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
          </button>
        </div>
      )}

      {/* ── 1. What needs a decision ─────────────────────────────────────── */}
      <ExecutiveBrief
        signals={briefSignals}
        topProjects={attentionRows.slice(0, 3).map(r => r.project)}
        actions={attentionRows.length > 0 ? [
          { label: `Review ${plural(attentionRows.length, 'project')}`, primary: true,
            onClick: () => document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
        ] : []}
      />

      {/* ── 2. Where the portfolio stands ────────────────────────────────── */}
      <section aria-labelledby="band-portfolio">
        <div className="x-band-head">
          <h2 id="band-portfolio" className="x-band-title">Portfolio</h2>
          {useOrg && <span className="x-band-note">Organisation-wide figures</span>}
        </div>
        <MetricRail metrics={metrics} />
        <div className="mt-8">
          <PortfolioMeter
            total={healthData.reduce((a, d) => a + d.value, 0)}
            segments={healthData.map(d => ({
              name: d.name,
              value: d.value,
              color: d.color,
              selected: activeFilter?.type === 'health' && activeFilter.label === d.name,
              onSelect: () => setActiveFilter(prev =>
                prev?.type === 'health' && prev.label === d.name
                  ? null
                  : { type: 'health', label: d.name, filterFn: healthFilters[d.name as keyof typeof healthFilters] }),
            }))}
          />
        </div>
      </section>

      {/* ── 3. What needs attention ──────────────────────────────────────── */}
      <section id="attention" aria-labelledby="band-attention">
        <div className="x-band-head">
          <h2 id="band-attention" className="x-band-title">Needs attention</h2>
          <span className="x-band-note">Ranked by overrun, then risk exposure</span>
        </div>
        <AttentionRegister
          rows={attentionRows}
          onOpen={openPanel}
          emptyHint="Nothing is overdue, at risk or stalled in this view."
          renderOwner={p => (
            <span className="inline-flex items-center gap-2 min-w-0">
              <OwnerAvatar name={p.owner} presence={presence[ownerEmail(p.owner)]} />
              <span className="truncate">{p.owner || '—'}</span>
            </span>
          )}
          rowAction={p => (
            <ShareToTeamsButton
              compact
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/projects/${p.id}`}
              text={`"${p.name}" (${p.id}) needs attention — owner ${p.owner}. Can we unblock this?`}
            />
          )}
        />
      </section>

      {/* ── 4. Distribution ──────────────────────────────────────────────── */}
      <section aria-labelledby="band-dist">
        <div className="x-band-head">
          <h2 id="band-dist" className="x-band-title">Distribution</h2>
          <span className="x-band-note">Select a bar to filter the page</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="min-w-0">
            <h3 className="x-fact-label mb-3">By status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusDistributionData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} width={28} />
                <Tooltip {...tooltipCommon} cursor={false} />
                <Bar dataKey="count" radius={BAR.radius} barSize={BAR.size}>
                  {statusDistributionData.map((entry, index) => {
                    const isSelected = activeFilter?.type === 'status' && activeFilter.label === entry.name;
                    const isDimmed = activeFilter?.type === 'status' && !isSelected;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        cursor="pointer"
                        opacity={isDimmed ? 0.3 : 1}
                        onClick={() => setActiveFilter(isSelected ? null : {
                          type: 'status', label: entry.name, filterFn: (p) => p.status === entry.name,
                        })}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-0">
            <h3 className="x-fact-label mb-3">By department</h3>
            <div className="flex flex-col gap-2.5">
              {deptChartData.filter(d => d.total > 0).map(d => {
                const seg = [
                  { v: d.active, c: STATUS_COLORS['In Progress'], n: 'Active' },
                  { v: d.done, c: STATUS_COLORS['Completed'], n: 'Done' },
                  { v: d.delayed, c: STATUS_COLORS['Delayed'], n: 'Delayed' },
                  // TRACK is a fixed light hex and glares white on the dark surface; the
                  // neutral remainder has to follow the theme.
                  { v: d.pending, c: 'var(--color-x-border)', n: 'Pending' },
                ];
                return (
                  <button
                    key={d.name}
                    onClick={() => setActiveFilter(prev =>
                      prev?.type === 'department' && prev.label === d.name
                        ? null
                        : { type: 'department', label: d.name, filterFn: (p) => p.department === d.name })}
                    className="text-left group cursor-pointer"
                    aria-pressed={activeFilter?.type === 'department' && activeFilter.label === d.name}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-[12.5px] text-[var(--color-x-text-secondary)] truncate group-hover:text-[var(--color-x-text)]">{d.name}</span>
                      <span className="text-[12px] font-semibold text-[var(--color-x-text)] tabular-nums flex-none">
                        {d.total}
                        {d.delayed > 0 && <span className="ml-2 font-medium text-[var(--color-x-danger)]">{d.delayed} late</span>}
                      </span>
                    </div>
                    <span className="x-meter" style={{ height: 8 }} role="img" aria-label={seg.map(s => `${s.n} ${s.v}`).join(', ')}>
                      {seg.filter(s => s.v > 0).map(s => (
                        <i key={s.n} style={{ flexBasis: `${(s.v / d.total) * 100}%`, background: s.c }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. What's next ───────────────────────────────────────────────── */}
      <section aria-labelledby="band-next" className="no-print">
        <div className="x-band-head">
          <h2 id="band-next" className="x-band-title">What&rsquo;s next</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h3 className="x-fact-label mb-3 inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Upcoming milestones</h3>
            {(() => {
              const upcoming = filteredProjects
                .filter(p => { const d = daysUntil(p.targetDate); return d !== null && d >= 0 && p.status !== 'Completed'; })
                .sort((a, b) => (daysUntil(a.targetDate) ?? 0) - (daysUntil(b.targetDate) ?? 0))
                .slice(0, 6);
              if (upcoming.length === 0) {
                return <p className="text-[12.5px] text-[var(--color-x-text-muted)] py-3">No upcoming deadlines in this view.</p>;
              }
              return (
                <ul className="flex flex-col">
                  {upcoming.map((p, i) => {
                    const d = daysUntil(p.targetDate) ?? 0;
                    return (
                      <li key={p.id}
                          onClick={() => openPanel(p)}
                          className="flex items-baseline gap-3 py-2.5 cursor-pointer hover:bg-[var(--color-x-bg)] -mx-2 px-2 rounded-md transition-colors"
                          style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-x-border)' }}>
                        <span className="text-[12.5px] text-[var(--color-x-text)] truncate flex-1 min-w-0">{p.name.replace(/\s+/g, ' ').trim()}</span>
                        <span className={`text-[12px] tabular-nums flex-none ${d <= 7 ? 'font-semibold text-[var(--color-x-warning)]' : 'text-[var(--color-x-text-muted)]'}`}>
                          {d === 0 ? 'today' : `in ${d}d`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>
          <div>
            <h3 className="x-fact-label mb-3 inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" aria-hidden="true" /> Recent activity</h3>
            <ActivityFeed />
          </div>
        </div>
      </section>

      {/* Quick Edit Side Panel (shared component) */}
      <QuickEditPanel project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
