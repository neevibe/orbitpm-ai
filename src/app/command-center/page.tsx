'use client';

import { useData } from '@/lib/data-context';
import {
  Activity, TrendingUp, AlertTriangle, Users, Target, Shield,
  ArrowUpRight, ArrowDownRight, Zap, Clock, BarChart3, Eye,
  Rocket, CheckCircle2, XCircle, Flame, Calendar, Edit3, Save, X, Trash2, Download
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import React, { useState } from 'react';
import { Project } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { formatDate, formatINR } from '@/lib/utils';
import DepartmentLabel from '@/components/DepartmentLabel';

const statusOptions = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function CommandCenter() {
  const router = useRouter();
  const { projects, risks, departments, kpi, updateProject } = useData();
  const [activeFilter, setActiveFilter] = useState<{
    type: 'status' | 'priority' | 'department' | 'health' | 'kpi' | 'ai';
    label: string;
    filterFn: (p: Project) => boolean;
  } | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [isEditing, setIsEditing] = useState(false);

  const openPanel = (p: Project) => {
    setSelectedProject(p);
    setEditForm({ status: p.status, priority: p.priority, progress: p.progress, owner: p.owner, targetDate: p.targetDate });
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, editForm);
    setSelectedProject(prev => prev ? { ...prev, ...editForm } : prev);
    setIsEditing(false);
  };

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
      { name: 'On Track', value: onTrack, color: '#10b981' },
      { name: 'At Risk', value: atRisk, color: '#f59e0b' },
      { name: 'Delayed', value: delayed, color: '#ef4444' },
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
      { name: 'Not Started', count: sourceProjects.filter(p => p.status === 'Not Started').length, color: '#9ca3af' },
      { name: 'In Progress', count: sourceProjects.filter(p => p.status === 'In Progress').length, color: '#3b82f6' },
      { name: 'On Hold', count: sourceProjects.filter(p => p.status === 'On Hold').length, color: '#f59e0b' },
      { name: 'Delayed', count: sourceProjects.filter(p => p.status === 'Delayed').length, color: '#ef4444' },
      { name: 'Completed', count: sourceProjects.filter(p => p.status === 'Completed').length, color: '#10b981' },
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
      { name: 'Critical', value: critical, fill: '#ef4444' },
      { name: 'High', value: high, fill: '#f97316' },
      { name: 'Medium', value: medium, fill: '#eab308' },
      { name: 'Low', value: low, fill: '#22c55e' },
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

  const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px' };

  return (
    <div className="x-page space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Dashboard</h1>
          <p className="x-page-subtitle">Commercial Portfolio · Real-time executive intelligence</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[12px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
          <span className="text-[11px] text-[var(--color-x-text-muted)]">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Projects', value: localKpi.totalProjects, icon: BarChart3, accent: '#6366f1', filterType: 'all', filterFn: () => true },
          { label: 'Active', value: localKpi.inProgress, icon: Rocket, accent: '#3b82f6', trend: { dir: 'up', pct: '12%' }, filterType: 'status', filterFn: (p: Project) => p.status === 'In Progress' },
          { label: 'Completed', value: localKpi.completed, icon: CheckCircle2, accent: '#10b981', trend: { dir: 'up', pct: `${pctComplete}%` }, filterType: 'status', filterFn: (p: Project) => p.status === 'Completed' },
          { label: 'Delayed', value: localKpi.delayed, icon: XCircle, accent: '#ef4444', trend: localKpi.delayed > 0 ? { dir: 'down', pct: `${localKpi.delayed}` } : null, filterType: 'status', filterFn: (p: Project) => p.status === 'Delayed' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: Target, accent: '#8b5cf6', trend: null, filterType: 'progress', filterFn: (p: Project) => p.progress > 0 && p.progress < 100 },
          { label: 'Open Risks', value: localKpi.openRisks, icon: Shield, accent: '#f59e0b', trend: localKpi.openRisks > 3 ? { dir: 'down', pct: `${localKpi.openRisks}` } : null, filterType: 'risk', filterFn: (p: Project) => risks.some(r => r.projectId === p.id && r.status === 'Open') },
        ].map((m, i) => {
          const isSelected = activeFilter?.type === 'kpi' && activeFilter.label === m.label;
          const isDimmed = activeFilter && !isSelected && !(activeFilter.type === 'kpi' && m.filterType === 'all');
          
          return (
            <button 
              key={m.label} 
              onClick={() => {
                if (m.filterType === 'all') {
                  setActiveFilter(null);
                } else if (isSelected) {
                  setActiveFilter(null);
                } else {
                  setActiveFilter({
                    type: 'kpi',
                    label: m.label,
                    filterFn: m.filterFn
                  });
                }
              }}
              className={`x-metric animate-slide-up stagger-${i + 1} text-left transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-indigo-500 scale-[1.03] shadow-md bg-[var(--color-x-surface)] border-indigo-200' : 'hover:scale-[1.02] hover:shadow-md'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`} 
              style={{ '--metric-accent': m.accent } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-2">
                <m.icon className="w-4 h-4" style={{ color: m.accent }} />
                {m.trend && (
                  <span className={`x-metric-trend ${m.trend.dir === 'up' ? 'up' : 'down'}`}>
                    {m.trend.dir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {m.trend.pct}
                  </span>
                )}
              </div>
              <p className="x-metric-value">{m.value}</p>
              <p className="x-metric-label">{m.label}</p>
            </button>
          );
        })}
      </div>



      {/* Main Grid — 3 columns */}
      <div className="grid grid-cols-12 gap-4">
        {/* AI Recommendations — left col */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="x-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">AI Recommendations</h3>
            </div>
            <div className="space-y-2">
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
                      isSelected ? 'ring-2 ring-indigo-500 scale-[1.01] shadow-md bg-white border-transparent' : 'hover:scale-[1.01] hover:shadow-sm'
                    } ${isDimmed ? 'opacity-40' : 'opacity-100'} ${
                      insight.severity === 'critical' ? 'bg-red-50/60 border-red-100 hover:bg-red-50' :
                      insight.severity === 'warning' ? 'bg-amber-50/60 border-amber-100 hover:bg-amber-50' :
                      insight.severity === 'success' ? 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50' : 'bg-blue-50/60 border-blue-100 hover:bg-blue-50'
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

          {/* Stuck Projects */}
          {stuckProjects.length > 0 && (
            <div className="x-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-red-500" />
                <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">Stuck Projects</h3>
                <span className="x-badge x-badge-red text-[9px]">{stuckProjects.length}</span>
              </div>
              <div className="space-y-2">
                {stuckProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => openPanel(p)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--color-x-bg)] transition-all cursor-pointer group"
                  >
                    <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${p.priority === 'Critical' ? 'bg-red-500' : p.priority === 'High' ? 'bg-orange-400' : 'bg-indigo-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[var(--color-x-text)] truncate group-hover:text-indigo-600">{p.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-x-text-muted)] flex-wrap">
                        <span className="font-mono">{p.id}</span>
                        <span>·</span>
                        <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" />
                        <span>·</span>
                        <span>{p.owner}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProject(p.id, { dismissedFromStuck: true });
                        }}
                        title="Remove from Stuck list"
                        className="flex items-center justify-center p-1 text-[var(--color-x-text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className={`x-priority-${p.priority.toLowerCase()} text-[9px]`}>{p.priority}</span>
                      <div
                        onClick={() => openPanel(p)}
                        className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 text-indigo-600 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Edit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
         </div>

        {/* Center — Charts */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Project Status Distribution */}
          <div className="x-card p-5 h-[310px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-indigo-500" /> Project Status Distribution</h3>
              <span className="text-[10px] text-[var(--color-x-text-muted)]">Active Portfolio</span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistributionData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={false} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
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

          {/* Department Breakdown */}
          <div className="x-card p-5 h-[310px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-blue-500" /> Department Breakdown</h3>
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
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} width={150} interval={0} />
                  <Tooltip contentStyle={tooltipStyle} cursor={false} />
                  <Bar dataKey="active" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={14} name="Active">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-act-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="done" stackId="a" fill="#10b981" name="Done">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-done-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="delayed" stackId="a" fill="#ef4444" name="Delayed">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-del-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                  <Bar dataKey="pending" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Pending">
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-pend-${index}`} opacity={activeFilter?.type === 'department' && activeFilter.label !== entry.fullName ? 0.35 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right col — Status + Priority + Overloaded */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Portfolio Health */}
          <div className="x-card p-5 h-[310px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><Eye className="w-4 h-4 text-purple-500" /> Portfolio Health</h3>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={healthData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value" strokeWidth={0}>
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
                  <Tooltip contentStyle={tooltipStyle} cursor={false} />
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
                      isSelected ? 'ring-1 ring-indigo-500 bg-indigo-50/20 font-semibold' : ''
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

          {/* Priority Breakdown */}
          <div className="x-card p-5 h-[310px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Priority Mix</h3>
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
                      isSelected ? 'ring-1 ring-indigo-500 bg-indigo-50/20' : ''
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

      {/* Filtered Projects Section (Full Width, replaces blocking modals) */}
      {activeFilter && (
        <div className="x-card p-5 border-indigo-200 bg-indigo-50/10 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[var(--color-x-border)] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Filter Active
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-50 transition-colors shadow-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjects.map(p => (
              <div
                key={p.id}
                onClick={() => openPanel(p)}
                className="p-4 bg-white border border-[var(--color-x-border)] hover:border-indigo-300 hover:shadow-md rounded-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-[var(--color-x-text-muted)] bg-slate-50 px-1.5 py-0.5 rounded">{p.id}</span>
                    <span className={`x-status-${p.status.toLowerCase().replace(' ', '-')} text-[9px]`}>{p.status}</span>
                  </div>
                  <h4 className="text-[13.5px] font-semibold text-[var(--color-x-text)] group-hover:text-indigo-600 transition-colors line-clamp-1">{p.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-x-border)] text-[10.5px] text-[var(--color-x-text-muted)]">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {p.owner}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
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

      {/* Milestones / Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="x-card p-5">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-500" /> Upcoming Milestones</h3>
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
        <div className="x-card p-5 bg-gradient-to-br from-indigo-50/40 to-purple-50/40 border-indigo-100">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-indigo-500" /> Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Project', icon: '📁', href: '/projects' },
              { label: 'Log Risk', icon: '⚠️', href: '/risks' },
              { label: 'View Reports', icon: '📊', href: '/analytics' },
              { label: 'Ask AI', icon: '🤖', href: '/ai' },
              { label: 'Team Status', icon: '👥', href: '/workforce' },
              { label: 'Export Data', icon: '📥', href: '/admin' },
            ].map(a => (
              <a key={a.label} href={a.href} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 border border-[var(--color-x-border)] hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
                <span className="text-[16px]">{a.icon}</span>
                <span className="text-[12px] font-medium text-[var(--color-x-text-secondary)]">{a.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Edit Side Panel */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setSelectedProject(null)}>
          <div
            className="w-full max-w-md bg-white shadow-2xl border-l border-[#e2e8f0] h-full overflow-y-auto"
            style={{ animation: 'slideInFromRight 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div className="px-5 py-4 border-b border-[#f1f5f9] flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <div>
                <p className="text-[10px] font-mono text-indigo-500 font-bold">{selectedProject.id}</p>
                <h2 className="text-[14px] font-bold text-[#0f172a] leading-tight">{selectedProject.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[12px] font-bold hover:bg-indigo-700 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : (
                  <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[12px] font-bold hover:bg-emerald-700 transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                )}
                <button onClick={() => setSelectedProject(null)} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const days = daysUntil(selectedProject.targetDate);
                if (days === null) return null;
                return (
                  <div className={`rounded-xl p-3 border flex items-center gap-2 ${days < 0 ? 'bg-red-50 border-red-200' : days <= 7 ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
                    <Calendar className={`w-4 h-4 ${days < 0 ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <p className={`text-[12px] font-bold ${days < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                        {days < 0 ? `Overdue by ${Math.abs(days)} days` : `${days} days until deadline`}
                      </p>
                      <p className="text-[11px] text-[#64748b]">Target: {formatDate(selectedProject.targetDate)}</p>
                    </div>
                  </div>
                );
              })()}
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Status</label>
                {isEditing ? (
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))} className="x-input w-full">
                    {statusOptions.map(s => <option key={s}>{s}</option>)}
                  </select>
                ) : <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.status}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Priority</label>
                {isEditing ? (
                  <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as any }))} className="x-input w-full">
                    {priorityOptions.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.priority}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Progress</label>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" value={editForm.progress ?? 0} onChange={e => setEditForm(f => ({ ...f, progress: Number(e.target.value) }))} className="flex-1 accent-indigo-600" />
                    <span className="text-[14px] font-bold text-[#0f172a] w-10 text-right">{editForm.progress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedProject.progress}%` }} />
                    </div>
                    <span className="text-[14px] font-bold text-[#0f172a]">{selectedProject.progress}%</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Owner</label>
                {isEditing ? (
                  <input value={editForm.owner || ''} onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))} className="x-input w-full" />
                ) : <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.owner || '—'}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Department ↳ Subdivision</label>
                <DepartmentLabel department={selectedProject.department} subdivision={selectedProject.subdivision} variant="stacked" className="text-[13px]" />
              </div>
              <button
                onClick={() => router.push(`/projects/${selectedProject.id}`)}
                className="w-full mt-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[13px] rounded-xl border border-indigo-100 transition-colors"
              >
                Open Full Project Detail →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
