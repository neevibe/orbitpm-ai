'use client';

import { useData } from '@/lib/data-context';
import {
  Activity, TrendingUp, AlertTriangle, Users, Target, Shield,
  ArrowUpRight, ArrowDownRight, Zap, Clock, BarChart3, Eye,
  Rocket, CheckCircle2, XCircle, Flame, Calendar, Edit3, X, Trash2, Download,
  FolderKanban, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import React, { useState } from 'react';
import { Project } from '@/lib/mock-data';
import DepartmentLabel from '@/components/DepartmentLabel';
import QuickEditPanel from '@/components/project/QuickEditPanel';
import { STATUS_COLORS, HEALTH_COLORS, PRIORITY_COLORS, TRACK, AXIS_TICK, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, BAR } from '@/lib/chart-theme';
import { usePresence, OwnerAvatar, ShareToTeamsButton, emailForName as ownerEmail } from '@/components/collab/TeamsCollab';
import ActivityFeed from '@/components/collab/ActivityFeed';


function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function CommandCenter() {
  const { projects, risks, departments, updateProject, liveStatus, scope, orgStats } = useData();
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

  const avgProgress = filteredProjects.length > 0
    ? Math.round(filteredProjects.reduce((a, p) => a + p.progress, 0) / filteredProjects.length)
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

  // Priority breakdown for radial/progress lines
  const priorityRadial = React.useMemo(() => {
    const sourceProjects = activeFilter?.type === 'priority' ? activeProjects : filteredProjects;
    const critical = sourceProjects.filter(p => p.priority === 'Critical').length;
    const high = sourceProjects.filter(p => p.priority === 'High').length;
    const medium = sourceProjects.filter(p => p.priority === 'Medium').length;
    const low = sourceProjects.filter(p => p.priority === 'Low').length;

    return [
      { name: 'Critical', value: critical, fill: PRIORITY_COLORS.Critical },
      { name: 'High', value: high, fill: PRIORITY_COLORS.High },
      { name: 'Medium', value: medium, fill: PRIORITY_COLORS.Medium },
      { name: 'Low', value: low, fill: PRIORITY_COLORS.Low },
    ].filter(d => d.value > 0);
  }, [activeProjects, filteredProjects, activeFilter]);

  // Stuck projects: delayed status OR (targetDate < Today and status !== Completed)
  const stuckProjects = React.useMemo(() => {
    return filteredProjects.filter(p => {
      if (p.status === 'Completed' || p.archived || p.dismissedFromStuck) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      const isDelayed = p.status === 'Delayed';
      const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
      return isDelayed || isOverdue;
    }).sort((a, b) => {
      const da = daysUntil(a.targetDate) ?? 999;
      const db = daysUntil(b.targetDate) ?? 999;
      return da - db;
    }).slice(0, 5);
  }, [filteredProjects]);

  // Live Teams presence for stuck-project owners (renders only when the
  // viewer has connected Microsoft in Integrations — no fabricated dots).
  const { presence } = usePresence(stuckProjects.map(p => p.owner));

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
        filterFn: (p: Project) => true
      });
    }
    return items;
  }, [localKpi, overloaded, highRisks, pctComplete, risks]);

  const tooltipStyle = TOOLTIP_STYLE;
  const tooltipCommon = { contentStyle: TOOLTIP_STYLE, labelStyle: TOOLTIP_LABEL_STYLE, itemStyle: TOOLTIP_ITEM_STYLE };

  return (
    <div className="x-page space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Activity className="w-5 h-5 text-[var(--color-x-accent)]" /> Dashboard</h1>
          <p className="x-page-subtitle">Commercial Portfolio · Real-time executive intelligence</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="x-btn x-btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          {scope && liveStatus === 'live' && (
            <span
              title={scope.admin
                ? 'Admin view — every department is visible'
                : 'Departmental privacy is on: you see your department plus projects that depend on it'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-x-bg)] border border-[var(--color-x-border)] text-[11px] font-semibold text-[var(--color-x-text-secondary)]"
            >
              <Eye className="w-3 h-3" />
              {scope.admin
                ? 'All departments'
                : `Showing: ${scope.department || 'no department assigned'}${scope.shared ? ` + ${scope.shared} shared` : ''}`}
            </span>
          )}
          {/* Non-intrusive data-freshness indicator: a dot and a word.
              The loud full-width warning lives in the global SystemBanner. */}
          {liveStatus === 'live' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-x-text-muted)]" title="Data is live from the server">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-success)]" /> Live
            </span>
          ) : liveStatus === 'error' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-x-danger)]" title="The server refresh failed — these numbers are an offline copy.">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-danger)]" /> Offline copy
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-x-text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-x-warning)] animate-pulse" /> Loading…
            </span>
          )}
          <span className="text-[11px] text-[var(--color-x-text-muted)]">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Compact KPI strip — 6 stats in one bordered container. Trends stay
          computed from live data (no fabricated deltas); each cell still
          click-filters the grid below. */}
      <div className="x-kpi-strip grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 animate-fade-in">
        {(() => {
          // Scoped (non-admin) users see ORGANIZATION-WIDE figures on the KPI
          // row (numbers only — detail pages stay department-scoped). Admins
          // and demo keep locally computed figures that drive card filtering.
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
          const kAvgProgress = useOrg ? orgStats!.avgProgress : avgProgress;
          const kOpenRisks = useOrg ? orgStats!.openRisks : localKpi.openRisks;
          const kHighRisks = useOrg ? orgStats!.highImpactRisks : highRisks.length;
          const kPctComplete = useOrg && k.totalProjects ? Math.round((k.completed / k.totalProjects) * 100) : pctComplete;
          const delayedPct = k.totalProjects ? Math.round((k.delayed / k.totalProjects) * 100) : 0;
          return [
            { label: 'Total Projects', value: k.totalProjects, icon: BarChart3, accent: '#1e40af', trend: { tone: newThisMonth > 0 ? 'up' : 'flat', text: newThisMonth > 0 ? `+${newThisMonth} this month` : 'no new this month' }, filterType: 'all', filterFn: () => true },
            { label: 'Active', value: k.inProgress, icon: Rocket, accent: '#4e79a7', trend: { tone: dueSoon > 0 ? 'warn' : 'flat', text: dueSoon > 0 ? `${dueSoon} due in 7d` : 'none due in 7d' }, filterType: 'status', filterFn: (p: Project) => p.status === 'In Progress' },
            { label: 'Completed', value: k.completed, icon: CheckCircle2, accent: '#59a14f', trend: { tone: 'up', text: `${kPctComplete}% of portfolio` }, filterType: 'status', filterFn: (p: Project) => p.status === 'Completed' },
            { label: 'Delayed', value: k.delayed, icon: XCircle, accent: '#d1615d', trend: { tone: k.delayed > 0 ? 'down' : 'up', text: k.delayed > 0 ? `${delayedPct}% of portfolio` : 'all on schedule' }, filterType: 'status', filterFn: (p: Project) => p.status === 'Delayed' },
            { label: 'Avg Progress', value: `${kAvgProgress}%`, icon: Target, accent: '#64748b', trend: { tone: stalled > 0 ? 'warn' : 'flat', text: stalled > 0 ? `${stalled} stalled at 0%` : 'steady pace' }, filterType: 'progress', filterFn: (p: Project) => p.progress > 0 && p.progress < 100 },
            { label: 'Open Risks', value: kOpenRisks, icon: Shield, accent: '#e8a838', trend: { tone: kHighRisks > 0 ? 'down' : 'flat', text: kHighRisks > 0 ? `${kHighRisks} high impact` : 'low exposure' }, filterType: 'risk', filterFn: (p: Project) => risks.some(r => r.projectId === p.id && r.status === 'Open') },
          ];
        })().map((m) => {
          const isSelected = activeFilter?.type === 'kpi' && activeFilter.label === m.label;
          const isDimmed = activeFilter && !isSelected && !(activeFilter.type === 'kpi' && m.filterType === 'all');

          return (
            <button
              key={m.label}
              onClick={() => {
                if (m.filterType === 'all' || isSelected) {
                  setActiveFilter(null);
                } else {
                  setActiveFilter({
                    type: 'kpi',
                    label: m.label,
                    filterFn: m.filterFn
                  });
                }
              }}
              className={`x-kpi-cell ${isSelected ? 'active' : ''} ${isDimmed ? 'opacity-50' : ''}`}
              style={{ '--metric-accent': m.accent } as React.CSSProperties}
            >
              <div className="flex items-center gap-1.5">
                <m.icon className="w-3.5 h-3.5" style={{ color: m.accent }} />
                <span className="x-kpi-label">{m.label}</span>
              </div>
              <p className="x-kpi-value mt-1">{m.value}</p>
              <span className={`text-[11px] font-medium inline-flex items-center gap-0.5 mt-0.5 ${
                m.trend.tone === 'up' ? 'text-[var(--color-x-success)]' :
                m.trend.tone === 'down' ? 'text-[var(--color-x-danger)]' :
                m.trend.tone === 'warn' ? 'text-[var(--color-x-warning)]' :
                'text-[var(--color-x-text-muted)]'
              }`}>
                {m.trend.tone === 'up' && <ArrowUpRight className="w-3 h-3" />}
                {m.trend.tone === 'down' && <ArrowDownRight className="w-3 h-3" />}
                {m.trend.text}
              </span>
            </button>
          );
        })}
      </div>



      {/* Main workspace — asymmetric enterprise layout: analytical charts fill
          the 8-col main column; the 4-col right rail carries the action surfaces
          (recommendations, blockers, priorities). Dense-flow lets the full-width
          Department chart drop below the two half-width charts. */}
      <div className="grid grid-cols-12 gap-4 items-start">
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 lg:grid-cols-2 grid-flow-dense gap-4 items-stretch content-start">
        <div className="min-w-0">
          {/* Project Status Distribution */}
          <div className="x-card p-5 h-[310px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)] flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[var(--color-x-text-muted)]" /> Project Status Distribution</h3>
              <span className="text-[11px] text-[var(--color-x-text-muted)]">Active portfolio</span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistributionData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip {...tooltipCommon} cursor={false} />
                  <Bar dataKey="count" radius={BAR.radius} barSize={BAR.size}>
                    {statusDistributionData.map((entry, index) => {
                      const isSelected = activeFilter?.type === 'status' && activeFilter.label === entry.name;
                      const isDimmed = activeFilter?.type === 'status' && activeFilter.label !== entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          cursor="pointer"
                          opacity={isDimmed ? 0.35 : 1}
                          onClick={() => {
                            if (isSelected) {
                              setActiveFilter(null);
                            } else {
                              setActiveFilter({
                                type: 'status',
                                label: entry.name,
                                filterFn: (p) => p.status === entry.name
                              });
                            }
                          }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="min-w-0 lg:col-span-2">
          {/* Department Breakdown — full main-column width: long bars + readable labels */}
          <div className="x-card p-5 h-[340px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)] flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-[var(--color-x-text-muted)]" /> Department Breakdown</h3>
              {/* Legend: stacked series were previously tooltip-only */}
              <div className="flex items-center gap-2.5">
                {[['Active', STATUS_COLORS['In Progress']], ['Done', STATUS_COLORS['Completed']], ['Delayed', STATUS_COLORS['Delayed']], ['Pending', TRACK]].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1 text-[10.5px] text-[var(--color-x-text-muted)]">
                    <span className="w-2 h-2 rounded-[2px]" style={{ background: color }} /> {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptChartData}
                  layout="vertical"
                  margin={{ left: 0 }}
                  onClick={(state) => {
                    if (state && state.activeLabel) {
                      const deptName = String(state.activeLabel);
                      const deptObj = deptChartData.find(d => d.name === deptName || d.fullName === deptName);
                      const fullName = deptObj ? deptObj.fullName : deptName;
                      
                      if (activeFilter?.type === 'department' && activeFilter.label === fullName) {
                        setActiveFilter(null);
                      } else {
                        setActiveFilter({
                          type: 'department',
                          label: fullName,
                          filterFn: (p) => p.department === fullName
                        });
                      }
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={150} interval={0} />
                  <Tooltip {...tooltipCommon} cursor={false} />
                  <Bar dataKey="active" stackId="a" fill={STATUS_COLORS['In Progress']} radius={[0, 0, 0, 0]} barSize={BAR.sizeSlim} name="Active">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-act-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="done" stackId="a" fill={STATUS_COLORS['Completed']} name="Done">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-done-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="delayed" stackId="a" fill={STATUS_COLORS['Delayed']} name="Delayed">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-del-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="pending" stackId="a" fill={TRACK} radius={BAR.radiusFlat} name="Pending">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-pend-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          {/* Portfolio Health */}
          <div className="x-card p-5 h-[310px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)] flex items-center gap-1.5"><Eye className="w-4 h-4 text-[var(--color-x-text-muted)]" /> Portfolio Health</h3>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center relative">
              {/* Center KPI: total tracked, so the donut reads at a glance */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[20px] font-bold text-[var(--color-x-text)] leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {healthData.reduce((a, h) => a + h.value, 0)}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-[var(--color-x-text-muted)] mt-0.5">tracked</span>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={healthData} cx="50%" cy="50%" innerRadius={44} outerRadius={58} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {healthData.map((entry, i) => {
                      const isSelected = activeFilter?.type === 'health' && activeFilter.label === entry.name;
                      const isDimmed = activeFilter?.type === 'health' && activeFilter.label !== entry.name;
                      return (
                        <Cell
                          key={i}
                          fill={entry.color}
                          cursor="pointer"
                          opacity={isDimmed ? 0.35 : 1}
                          onClick={() => {
                            if (isSelected) {
                              setActiveFilter(null);
                            } else {
                              setActiveFilter({
                                type: 'health',
                                label: entry.name,
                                filterFn: healthFilters[entry.name as 'On Track' | 'At Risk' | 'Delayed']
                              });
                            }
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip {...tooltipCommon} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-[var(--color-x-border)]">
              {healthData.map(h => {
                const isSelected = activeFilter?.type === 'health' && activeFilter.label === h.name;
                const isDimmed = activeFilter?.type === 'health' && activeFilter.label !== h.name;
                return (
                  <div
                    key={h.name}
                    onClick={() => {
                      if (isSelected) {
                        setActiveFilter(null);
                      } else {
                        setActiveFilter({
                          type: 'health',
                          label: h.name,
                          filterFn: healthFilters[h.name as 'On Track' | 'At Risk' | 'Delayed']
                        });
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-1 rounded hover:bg-slate-50 transition-all ${
                      isSelected ? 'ring-1 ring-blue-500 bg-blue-50/20 font-semibold' : ''
                    } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      <span className="text-[10px] text-[var(--color-x-text-muted)] truncate">{h.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--color-x-text)] mt-0.5">{h.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        {/* Right rail — the action column */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
        <div>
          <div className="x-card p-5 flex flex-col max-h-[340px]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-[var(--color-x-accent)] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)]">AI Recommendations</h3>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
              {aiInsights.map((insight, i) => {
                const isSelected = activeFilter?.type === 'ai' && activeFilter.label === insight.title;
                const isDimmed = activeFilter?.type === 'ai' && activeFilter.label !== insight.title;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (isSelected) {
                        setActiveFilter(null);
                      } else {
                        setActiveFilter({
                          type: 'ai',
                          label: insight.title,
                          filterFn: insight.filterFn
                        });
                      }
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-blue-500 scale-[1.01] shadow-md bg-[var(--color-x-surface)] border-transparent' : 'hover:scale-[1.01] hover:shadow-sm'
                    } ${isDimmed ? 'opacity-40' : 'opacity-100'} ${
                      // translucent severity tints read correctly on light AND dark surfaces
                      insight.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' :
                      insight.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15' :
                      insight.severity === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15' : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        insight.severity === 'critical' ? 'bg-red-500' :
                        insight.severity === 'warning' ? 'bg-amber-500' :
                        insight.severity === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-[12px] font-semibold text-[var(--color-x-text)]">{insight.title}</p>
                        <p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">{insight.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          {/* Stuck Projects */}
          {stuckProjects.length === 0 && (
            <div className="x-card p-5 h-[310px] flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-[var(--color-x-success)]" />
                <h3 className="text-[13px] font-semibold text-[var(--color-x-text)]">Stuck Projects</h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-8 h-8 text-[var(--color-x-success)] mb-2 opacity-70" />
                <p className="text-[13px] font-semibold text-[var(--color-x-text)]">Nothing is stuck</p>
                <p className="text-[11px] text-[var(--color-x-text-muted)] mt-1">No delayed or overdue projects right now.</p>
              </div>
            </div>
          )}
          {stuckProjects.length > 0 && (
            <div className="x-card p-5 flex flex-col max-h-[340px]">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-[var(--color-x-danger)]" />
                <h3 className="text-[13px] font-semibold text-[var(--color-x-text)]">Stuck Projects</h3>
                <span className="x-badge x-badge-red text-[9px]">{stuckProjects.length}</span>
                <span className="ml-auto text-[10.5px] text-[var(--color-x-text-muted)]">act on blockers without leaving</span>
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto min-h-0 -mx-1">
                {stuckProjects.map(p => {
                  const overdue = daysUntil(p.targetDate);
                  return (
                    <div
                      key={p.id}
                      onClick={() => openPanel(p)}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--color-x-bg)] transition-colors cursor-pointer group"
                    >
                      <OwnerAvatar name={p.owner} presence={presence[ownerEmail(p.owner)]} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[var(--color-x-text)] truncate group-hover:text-[var(--color-x-accent)]">{p.name}</p>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-x-text-muted)] flex-wrap">
                          <span>{p.owner}</span>
                          <span>·</span>
                          <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" />
                          {overdue !== null && overdue < 0 && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-[var(--color-x-danger)]">{Math.abs(overdue)}d overdue</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className={`x-priority-${p.priority.toLowerCase()} text-[9px]`}>{p.priority}</span>
                        <ShareToTeamsButton
                          compact
                          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/projects/${p.id}`}
                          text={`Blocker: "${p.name}" (${p.id}) is ${p.status === 'Delayed' ? 'delayed' : 'overdue'} — owner ${p.owner}. Can we unblock this?`}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); openPanel(p); }}
                          title="Quick edit"
                          className="p-1.5 rounded-md text-[var(--color-x-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-x-accent)] hover:bg-[var(--color-x-accent-light)] transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateProject(p.id, { dismissedFromStuck: true }); }}
                          title="Remove from Stuck list"
                          className="p-1.5 rounded-md text-[var(--color-x-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-x-danger)] hover:bg-[var(--color-x-danger-light)] transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div>
          {/* Priority Breakdown */}
          <div className="x-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-[var(--color-x-text-muted)]" /> Priority Mix</h3>
            </div>
            <div className="flex-1 flex flex-col justify-between py-1.5">
              {priorityRadial.map(p => {
                const pct = filteredProjects.length > 0 ? Math.round((p.value / filteredProjects.length) * 100) : 0;
                const isSelected = activeFilter?.type === 'priority' && activeFilter.label === p.name;
                const isDimmed = activeFilter?.type === 'priority' && activeFilter.label !== p.name;
                return (
                  <div
                    key={p.name}
                    onClick={() => {
                      if (isSelected) {
                        setActiveFilter(null);
                      } else {
                        setActiveFilter({
                          type: 'priority',
                          label: p.name,
                          filterFn: (project) => project.priority === p.name
                        });
                      }
                    }}
                    className={`p-1 rounded-lg transition-all cursor-pointer hover:bg-slate-50 ${
                      isSelected ? 'ring-1 ring-blue-500 bg-blue-50/20' : ''
                    } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-[var(--color-x-text-secondary)]">{p.name}</span>
                      <span className="text-[11px] font-bold text-[var(--color-x-text)]">{p.value} <span className="font-normal text-[var(--color-x-text-muted)]">({pct}%)</span></span>
                    </div>
                    <div className="x-progress"><div className="x-progress-bar" style={{ width: `${pct}%`, background: p.fill }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Filtered Projects Section (Full Width, replaces blocking modals) */}
      {activeFilter && (
        <div className="x-card p-5 border-blue-200 bg-blue-50/10 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[var(--color-x-border)] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Filter Active
              </span>
              <div>
                <h3 className="text-[14px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5">
                  {activeFilter.label} Projects
                </h3>
                <p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">Showing {filteredProjects.length} of {activeProjects.length} projects matching this criteria</p>
              </div>
            </div>
            <button
              onClick={() => setActiveFilter(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-50 transition-colors shadow-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjects.map(p => (
              <div
                key={p.id}
                onClick={() => openPanel(p)}
                className="p-4 bg-white border border-[var(--color-x-border)] hover:border-blue-300 hover:shadow-md rounded-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-[var(--color-x-text-muted)] bg-slate-50 px-1.5 py-0.5 rounded">{p.id}</span>
                    <span className={`x-status-${p.status.toLowerCase().replace(' ', '-')} text-[9px]`}>{p.status}</span>
                  </div>
                  <h4 className="text-[13.5px] font-semibold text-[var(--color-x-text)] group-hover:text-blue-600 transition-colors line-clamp-1">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-x-border)] text-[10.5px] text-[var(--color-x-text-muted)]">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {p.owner}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="font-bold text-[var(--color-x-text)]">{p.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="col-span-full py-12 text-center text-[13px] text-[var(--color-x-text-muted)]">
                No projects match the active filter. Click "Clear Filter" to view all.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom band continues the 8/4 split: Milestones + Activity under the
          main column, Quick Actions under the rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-4">
        <div className="x-card p-5">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Upcoming Milestones</h3>
          <div className="space-y-2">
            {filteredProjects
              // Upcoming = due today or later; overdue targets belong in Stuck/Delayed, not here.
              .filter(p => p.targetDate && p.status !== 'Completed' && (daysUntil(p.targetDate) ?? -1) >= 0)
              .sort((a, b) => new Date(a.targetDate || '').getTime() - new Date(b.targetDate || '').getTime())
              .slice(0, 6)
              .map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-x-bg)] transition-all">
                <span className="text-[10px] font-mono text-[var(--color-x-text-muted)] w-16 flex-shrink-0">{p.targetDate ? new Date(p.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--color-x-text)] truncate">{p.name}</p>
                  <p className="text-[10px] text-[var(--color-x-text-muted)]">{p.department}</p>
                </div>
                <div className="x-progress w-16"><div className={`x-progress-bar ${p.progress >= 50 ? 'x-progress-green' : 'x-progress-indigo'}`} style={{ width: `${Math.max(p.progress, 3)}%` }} /></div>
                <span className="text-[10px] font-semibold text-[var(--color-x-text-secondary)] w-8 text-right">{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity — real audit-trail events incl. delivered Teams alerts */}
        <ActivityFeed />
        </div>
        <div className="x-card p-5 lg:col-span-4 bg-gradient-to-br from-blue-50/60 to-sky-50/40 border-blue-100">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-500" /> Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Project', icon: FolderKanban, color: 'text-blue-500', href: '/projects' },
              { label: 'Log Risk', icon: AlertTriangle, color: 'text-red-500', href: '/risks' },
              { label: 'View Reports', icon: BarChart3, color: 'text-orange-500', href: '/analytics' },
              { label: 'Ask Xyro', icon: Sparkles, color: 'text-purple-500', href: '/ai' },
              { label: 'Team Status', icon: Users, color: 'text-emerald-500', href: '/workforce' },
              { label: 'Export Data', icon: Download, color: 'text-blue-500', href: '/admin' },
            ].map(a => (
              <a key={a.label} href={a.href} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 border border-[var(--color-x-border)] hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
                <a.icon className={`w-4 h-4 flex-shrink-0 ${a.color}`} />
                <span className="text-[12px] font-medium text-[var(--color-x-text-secondary)]">{a.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Edit Side Panel (shared component) */}
      <QuickEditPanel project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
