'use client';

import { useData } from '@/lib/data-context';
import { ArrowDownRight, ArrowUpRight, Calendar, CheckCircle2, Clock, Download, Eye, FolderKanban, Rocket, Shield, X, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/mock-data';
import QuickEditPanel from '@/components/project/QuickEditPanel';
import { STATUS_COLORS, HEALTH_COLORS, AXIS_TICK, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, BAR } from '@/lib/chart-theme';
import { usePresence, OwnerAvatar, ShareToTeamsButton, emailForName as ownerEmail } from '@/components/collab/TeamsCollab';
import ActivityFeed from '@/components/collab/ActivityFeed';
import Widget from '@/components/dashboard/command/Widget';
import StatusDonut from '@/components/dashboard/command/StatusDonut';
import TeamStatus from '@/components/dashboard/command/TeamStatus';
import AttentionRegister, { type AttentionRow } from '@/components/dashboard/command/AttentionRegister';
import { plural } from '@/lib/utils';


function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function CommandCenter() {
  const router = useRouter();
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

  // Scoped (non-admin) users see ORGANISATION-WIDE figures on the tile row
  // (numbers only — detail widgets stay department-scoped).
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

  const toggle = (type: 'kpi' | 'status' | 'health' | 'department' | 'priority' | 'ai', label: string, filterFn: (p: Project) => boolean) =>
    setActiveFilter(prev => (prev?.type === type && prev.label === label ? null : { type, label, filterFn }));

  const tiles = [
    { label: 'Projects', value: k.totalProjects, icon: FolderKanban, accent: '#1e40af',
      delta: newThisMonth > 0 ? `+${newThisMonth} this month` : 'no new', tone: newThisMonth > 0 ? 'up' : 'flat' },
    { label: 'Active', value: k.inProgress, icon: Rocket, accent: '#4e79a7',
      delta: dueSoon > 0 ? `${dueSoon} due in 7d` : 'none due in 7d', tone: dueSoon > 0 ? 'warn' : 'flat',
      filterFn: (p: Project) => p.status === 'In Progress' },
    { label: 'Completed', value: k.completed, icon: CheckCircle2, accent: '#59a14f',
      delta: `${kPctComplete}% of portfolio`, tone: 'flat',
      filterFn: (p: Project) => p.status === 'Completed' },
    { label: 'Delayed', value: k.delayed, icon: XCircle, accent: '#d1615d',
      delta: k.delayed > 0 ? `${Math.round((k.delayed / (k.totalProjects || 1)) * 100)}% of portfolio` : 'all on schedule',
      tone: k.delayed > 0 ? 'down' : 'up',
      filterFn: (p: Project) => p.status === 'Delayed' },
    { label: 'Stalled', value: stalled, icon: Clock, accent: '#e8a838',
      delta: stalled > 0 ? 'at 0% progress' : 'none stalled', tone: stalled > 0 ? 'warn' : 'flat',
      filterFn: (p: Project) => p.status === 'In Progress' && p.progress === 0 },
    { label: 'Open Risks', value: kOpenRisks, icon: Shield, accent: '#b45309',
      delta: kHighRisks > 0 ? `${kHighRisks} high impact` : 'low exposure', tone: kHighRisks > 0 ? 'down' : 'flat',
      filterFn: (p: Project) => risks.some(r => r.projectId === p.id && r.status === 'Open') },
  ] as const;

  const toneCls = (t: string) =>
    t === 'up' ? 'text-[var(--color-x-success)]'
    : t === 'down' ? 'text-[var(--color-x-danger)]'
    : t === 'warn' ? 'text-[var(--color-x-warning)]'
    : 'text-[var(--color-x-text-muted)]';

  // Milestone status, framed open vs closed — the Zoho-idiom framing an
  // executive reads without a key.
  const milestoneSlices = (() => {
    const withDate = filteredProjects.filter(p => p.targetDate);
    const closed = withDate.filter(p => p.status === 'Completed').length;
    const overdue = withDate.filter(p => p.status !== 'Completed' && (daysUntil(p.targetDate) ?? 1) < 0).length;
    const open = withDate.length - closed - overdue;
    return [
      { name: 'On schedule', value: open, color: STATUS_COLORS['In Progress'] },
      { name: 'Overdue', value: overdue, color: STATUS_COLORS['Delayed'] },
      { name: 'Closed', value: closed, color: STATUS_COLORS['Completed'] },
    ];
  })();

  const teamRows = React.useMemo(() => {
    const map: Record<string, { active: number; delayed: number }> = {};
    filteredProjects.forEach(p => {
      if (p.status === 'Completed' || !p.owner) return;
      const e = map[p.owner] ?? { active: 0, delayed: 0 };
      if (p.status === 'In Progress' || p.status === 'Delayed') e.active += 1;
      if (p.status === 'Delayed') e.delayed += 1;
      map[p.owner] = e;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.active - a.active || b.delayed - a.delayed)
      .slice(0, 6);
  }, [filteredProjects]);

  const upcoming = filteredProjects
    .filter(p => { const d = daysUntil(p.targetDate); return d !== null && d >= 0 && p.status !== 'Completed'; })
    .sort((a, b) => (daysUntil(a.targetDate) ?? 0) - (daysUntil(b.targetDate) ?? 0))
    .slice(0, 6);

  return (
    <div className="x-page space-y-4">
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
        <div className="flex items-center gap-3 no-print">
          {scope && liveStatus === 'live' && (
            <span
              title={scope.admin ? 'Admin view — every department is visible'
                : 'Departmental privacy is on: you see your department plus projects that depend on it'}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-x-surface)] border border-[var(--color-x-border)] text-[11px] font-medium text-[var(--color-x-text-secondary)]"
            >
              <Eye className="w-3 h-3" aria-hidden="true" />
              {scope.admin ? 'All departments' : `${scope.department || 'No department'}${scope.shared ? ` +${scope.shared} shared` : ''}`}
            </span>
          )}
          {liveStatus === 'live' ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-x-text-muted)]" title="Data is live from the server">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-success)]" aria-hidden="true" /> Live
            </span>
          ) : liveStatus === 'error' ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--color-x-danger)]" title="The server refresh failed — these numbers are an offline copy.">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-danger)]" aria-hidden="true" /> Offline copy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-x-text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-warning)] animate-pulse" aria-hidden="true" /> Loading
            </span>
          )}
          <button onClick={() => window.print()} className="x-btn x-btn-secondary text-[12px] px-3 py-1.5 inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export PDF
          </button>
        </div>
      </header>

      {activeFilter && (
        <div className="flex items-center gap-3 no-print">
          <span className="text-[12.5px] text-[var(--color-x-text-secondary)]">
            Filtered to <strong className="text-[var(--color-x-text)]">{activeFilter.label}</strong>
            <span className="text-[var(--color-x-text-muted)]"> — {plural(filteredProjects.length, 'project')} of {activeProjects.length}</span>
          </span>
          <button onClick={() => setActiveFilter(null)} className="text-[12px] font-medium text-[var(--color-x-accent)] inline-flex items-center gap-1 hover:underline cursor-pointer">
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
          </button>
        </div>
      )}

      {/* ── Row 1 — stat tiles ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map(t => {
          const selected = activeFilter?.type === 'kpi' && activeFilter.label === t.label;
          return (
            <button
              key={t.label}
              type="button"
              aria-pressed={selected}
              onClick={() => ('filterFn' in t && t.filterFn) ? toggle('kpi', t.label, t.filterFn) : setActiveFilter(null)}
              className="x-tile"
            >
              <span className="x-tile-plate" style={{ background: `color-mix(in srgb, ${t.accent} 12%, transparent)` }}>
                <t.icon className="w-[17px] h-[17px]" style={{ color: t.accent }} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="x-tile-value block">{t.value}</span>
                <span className="x-tile-label block">{t.label}</span>
                <span className={`x-tile-delta ${toneCls(t.tone)}`}>
                  {t.tone === 'up' && <ArrowUpRight className="w-3 h-3" aria-hidden="true" />}
                  {t.tone === 'down' && <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
                  {t.delta}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Row 2 — the three status donuts ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Widget title="Project Status" subtitle="Active portfolio">
          <StatusDonut
            centreValue={localKpi.totalProjects}
            centreLabel="Projects"
            slices={statusDistributionData.map(d => ({
              name: d.name, value: d.count, color: d.color,
              selected: activeFilter?.type === 'status' && activeFilter.label === d.name,
              onSelect: () => toggle('status', d.name, p => p.status === d.name),
            }))}
          />
        </Widget>

        <Widget title="Portfolio Health" subtitle="Risk-adjusted">
          <StatusDonut
            centreValue={healthData.reduce((a, d) => a + d.value, 0)}
            centreLabel="Tracked"
            slices={healthData.map(d => ({
              name: d.name, value: d.value, color: d.color,
              selected: activeFilter?.type === 'health' && activeFilter.label === d.name,
              onSelect: () => toggle('health', d.name, healthFilters[d.name as keyof typeof healthFilters]),
            }))}
          />
        </Widget>

        <Widget title="Milestone Status" subtitle="Projects with a target date">
          <StatusDonut
            centreValue={milestoneSlices.reduce((a, d) => a + d.value, 0)}
            centreLabel="Milestones"
            slices={milestoneSlices}
          />
        </Widget>
      </div>

      {/* ── Row 3 — overdue register + team load ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
        <Widget
          className="xl:col-span-2"
          title="Overdue Work Items"
          subtitle="Ranked by overrun, then risk exposure"
          action={<span className="text-[11px] font-semibold text-[var(--color-x-danger)] tabular-nums">{attentionRows.filter(r => r.band === 'delayed').length} overdue</span>}
          bodyClass="flush"
        >
          <div className="px-4 pt-3 pb-4">
            <AttentionRegister
              rows={attentionRows}
              maxRows={8}
              onViewAll={() => router.push('/projects?stuck=true')}
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
          </div>
        </Widget>

        <Widget title="Team Load" subtitle="Active work per owner">
          <TeamStatus
            rows={teamRows.map(r => ({ ...r, presence: presence[ownerEmail(r.name)] }))}
            onSelect={name => toggle('priority', name, p => p.owner === name)}
          />
        </Widget>
      </div>

      {/* ── Row 4 — department + milestones ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
        <Widget className="xl:col-span-2" title="Department Breakdown" subtitle="Select a department to filter">
          <div className="h-[248px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData.filter(d => d.total > 0)} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} width={132} />
                <Tooltip {...tooltipCommon} cursor={{ fill: 'var(--color-x-bg)' }} />
                <Bar dataKey="active" stackId="a" fill={STATUS_COLORS['In Progress']} barSize={BAR.sizeSlim} name="Active" />
                <Bar dataKey="done" stackId="a" fill={STATUS_COLORS['Completed']} name="Done" />
                <Bar dataKey="delayed" stackId="a" fill={STATUS_COLORS['Delayed']} name="Delayed" />
                <Bar dataKey="pending" stackId="a" fill="var(--color-x-border)" name="Pending" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-3 border-t border-[var(--color-x-border)]">
            {[['Active', STATUS_COLORS['In Progress']], ['Done', STATUS_COLORS['Completed']], ['Delayed', STATUS_COLORS['Delayed']], ['Pending', 'var(--color-x-border)']].map(([n, c]) => (
              <span key={n} className="inline-flex items-center gap-1.5">
                <span className="x-legend-sw" style={{ background: c }} aria-hidden="true" />
                <span className="text-[11px] text-[var(--color-x-text-muted)]">{n}</span>
              </span>
            ))}
          </div>
        </Widget>

        <Widget title="Upcoming Milestones" subtitle="Next deadlines in view">
          {upcoming.length === 0 ? (
            <p className="text-[12px] text-[var(--color-x-text-muted)] py-6 text-center">No upcoming deadlines in this view.</p>
          ) : (
            <ul className="flex flex-col">
              {upcoming.map(p => {
                const d = daysUntil(p.targetDate) ?? 0;
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => openPanel(p)} className="x-listrow px-2 -mx-2 rounded-md">
                      <Calendar className="w-3.5 h-3.5 flex-none text-[var(--color-x-text-faint)]" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] text-[var(--color-x-text)] truncate">{p.name.replace(/\s+/g, ' ').trim()}</span>
                        <span className="block text-[11px] text-[var(--color-x-text-muted)] truncate">{p.owner || 'Unassigned'}</span>
                      </span>
                      <span className={`flex-none text-[11.5px] font-semibold tabular-nums ${d <= 7 ? 'text-[var(--color-x-warning)]' : 'text-[var(--color-x-text-muted)]'}`}>
                        {d === 0 ? 'today' : `in ${d}d`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Widget>
      </div>

      {/* ── Row 5 — insight + activity ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start no-print">
        <Widget title="What needs a decision" subtitle="Ranked signals from the live register">
          <ul className="flex flex-col">
            {briefSignals.slice(0, 4).map(sg => (
              <li key={sg.title}>
                <button type="button" onClick={sg.onView} className="x-listrow px-2 -mx-2 rounded-md">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-none"
                    style={{ background: sg.severity === 'critical' ? 'var(--color-x-danger)' : sg.severity === 'warning' ? 'var(--color-x-warning)' : 'var(--color-x-text-faint)' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-medium text-[var(--color-x-text)] truncate">{sg.title}</span>
                    <span className="block text-[11px] text-[var(--color-x-text-muted)] truncate">{sg.detail}</span>
                  </span>
                </button>
              </li>
            ))}
            {briefSignals.length === 0 && (
              <li className="text-[12px] text-[var(--color-x-text-muted)] py-6 text-center">Nothing requires attention.</li>
            )}
          </ul>
        </Widget>

        <Widget className="xl:col-span-2" title="Recent Activity" subtitle="From the audit trail">
          <ActivityFeed />
        </Widget>
      </div>

      {/* Quick Edit Side Panel (shared component) */}
      <QuickEditPanel project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
