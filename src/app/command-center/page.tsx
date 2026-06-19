'use client';

import { useData } from '@/lib/data-context';
import {
  Activity, TrendingUp, AlertTriangle, Users, Target, Shield,
  ArrowUpRight, ArrowDownRight, Zap, Clock, BarChart3, Eye,
  Rocket, CheckCircle2, XCircle, Flame, Calendar, Edit3, Save, X, Trash2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend
} from 'recharts';
import React, { useState } from 'react';
import { Project } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { formatDate, formatINR, formatINRCompact } from '@/lib/utils';

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
  const [selectedMetric, setSelectedMetric] = useState<{ label: string; filter: (p: Project) => boolean } | null>(null);
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
  // Compute metrics
  const pctComplete = kpi.totalProjects > 0 ? Math.round((kpi.completed / kpi.totalProjects) * 100) : 0;
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length) : 0;
  const highRisks = risks.filter(r => r.impact === 'High' && r.status === 'Open');

  // Portfolio financial rollup (₹). Projects without values contribute 0.
  const fin = projects.reduce(
    (acc, p) => ({
      budget: acc.budget + (p.budget || 0),
      expected: acc.expected + (p.expectedValue || 0),
      actual: acc.actual + (p.actualValue || 0),
    }),
    { budget: 0, expected: 0, actual: 0 },
  );

  // Owner workload
  const ownerCounts: Record<string, number> = {};
  projects.filter(p => p.status === 'In Progress').forEach(p => { ownerCounts[p.owner] = (ownerCounts[p.owner] || 0) + 1; });
  const overloaded = Object.entries(ownerCounts).filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]);

  // Status pie
  const statusData = [
    { name: 'Active', value: kpi.inProgress, color: '#3b82f6' },
    { name: 'Completed', value: kpi.completed, color: '#10b981' },
    { name: 'Not Started', value: kpi.notStarted, color: '#d1d5db' },
    { name: 'Delayed', value: kpi.delayed, color: '#ef4444' },
    { name: 'On Hold', value: kpi.onHold, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  // Department chart
  const deptChartData = departments.slice(0, 7).map(d => ({
    name: d.name.length > 14 ? d.name.substring(0, 12) + '…' : d.name,
    active: d.inProgress,
    done: d.completed,
    pending: d.notStarted,
    delayed: d.delayed,
    total: d.total,
  }));

  // Delivery trend (mock months)
  const trendData = [
    { month: 'Jan', completed: 5, started: 8 }, { month: 'Feb', completed: 8, started: 12 },
    { month: 'Mar', completed: 12, started: 18 }, { month: 'Apr', completed: 18, started: 22 },
    { month: 'May', completed: kpi.completed, started: kpi.inProgress + kpi.completed },
  ];

  // Priority breakdown for radial
  const priorityRadial = [
    { name: 'Critical', value: kpi.critical, fill: '#ef4444' },
    { name: 'High', value: kpi.high, fill: '#f97316' },
    { name: 'Medium', value: kpi.medium, fill: '#eab308' },
    { name: 'Low', value: kpi.low, fill: '#22c55e' },
  ].filter(d => d.value > 0);

  // Stuck projects: deadline within 7 days, any priority, not completed, not dismissed
  const stuckProjects = projects.filter(p => {
    if (p.status === 'Completed' || p.archived || p.dismissedFromStuck) return false;
    const days = daysUntil(p.targetDate);
    return days !== null && days <= 7;
  }).sort((a, b) => {
    const da = daysUntil(a.targetDate) ?? 999;
    const db = daysUntil(b.targetDate) ?? 999;
    return da - db;
  }).slice(0, 5);

  // AI insights
  const aiInsights = React.useMemo(() => {
    const items: { severity: 'critical' | 'warning' | 'info' | 'success'; title: string; desc: string }[] = [];
    if (kpi.stuckProjects > 0) items.push({ severity: 'critical', title: `${kpi.stuckProjects} high-priority projects at 0%`, desc: 'Require immediate owner intervention' });
    if (kpi.delayed > 0) items.push({ severity: 'warning', title: `${kpi.delayed} project${kpi.delayed > 1 ? 's' : ''} delayed`, desc: 'Timeline slippage detected across portfolio' });
    if (overloaded.length > 0) items.push({ severity: 'warning', title: `${overloaded.length} team member${overloaded.length > 1 ? 's' : ''} overloaded`, desc: `${overloaded[0]?.[0]} carrying ${overloaded[0]?.[1]} active projects` });
    if (highRisks.length > 0) items.push({ severity: 'critical', title: `${highRisks.length} high-impact risks open`, desc: 'Escalation review recommended this week' });
    if (pctComplete > 10) items.push({ severity: 'success', title: `${pctComplete}% portfolio completion`, desc: `${kpi.completed} projects delivered successfully` });
    if (items.length === 0) items.push({ severity: 'info', title: 'All systems operational', desc: 'No critical alerts at this time' });
    return items;
  }, [kpi, overloaded, highRisks, pctComplete]);

  const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px' };

  return (
    <div className="x-page space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Dashboard</h1>
          <p className="x-page-subtitle">Commercial Portfolio · Real-time executive intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
          <span className="text-[11px] text-[var(--color-x-text-muted)]">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Projects', value: kpi.totalProjects, icon: BarChart3, accent: '#6366f1', trend: null, filter: () => true },
          { label: 'Active', value: kpi.inProgress, icon: Rocket, accent: '#3b82f6', trend: { dir: 'up', pct: '12%' }, filter: (p: Project) => p.status === 'In Progress' },
          { label: 'Completed', value: kpi.completed, icon: CheckCircle2, accent: '#10b981', trend: { dir: 'up', pct: `${pctComplete}%` }, filter: (p: Project) => p.status === 'Completed' },
          { label: 'Delayed', value: kpi.delayed, icon: XCircle, accent: '#ef4444', trend: kpi.delayed > 0 ? { dir: 'down', pct: `${kpi.delayed}` } : null, filter: (p: Project) => p.status === 'Delayed' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: Target, accent: '#8b5cf6', trend: null, filter: (p: Project) => p.progress > 0 && p.progress < 100 },
          { label: 'Open Risks', value: kpi.openRisks, icon: Shield, accent: '#f59e0b', trend: kpi.openRisks > 3 ? { dir: 'down', pct: `${kpi.openRisks}` } : null, isRisks: true },
        ].map((m, i) => (
          <button 
            key={m.label} 
            onClick={() => !m.isRisks && m.filter && setSelectedMetric({ label: m.label, filter: m.filter as (p: Project) => boolean })}
            className={`x-metric animate-slide-up stagger-${i + 1} text-left hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer`} 
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
        ))}
      </div>

      {/* Financial value rollup (₹) */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Portfolio Budget', value: fin.budget, color: '#6366f1', bg: 'from-indigo-50/60' },
          { label: 'Expected Revenue / Savings', value: fin.expected, color: '#10b981', bg: 'from-emerald-50/60' },
          { label: 'Actual Value Delivered', value: fin.actual, color: '#f59e0b', bg: 'from-amber-50/60' },
        ].map(f => (
          <div key={f.label} className={`x-card p-4 bg-gradient-to-br ${f.bg} to-transparent`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-x-text-muted)] mb-1">{f.label}</p>
            <p className="text-[22px] font-bold" style={{ color: f.color }}>{formatINRCompact(f.value)}</p>
            <p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">{formatINR(f.value)}</p>
          </div>
        ))}
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
              {aiInsights.map((insight, i) => (
                <div key={i} className={`p-3 rounded-lg border transition-all hover:shadow-sm ${
                  insight.severity === 'critical' ? 'bg-red-50/60 border-red-100' :
                  insight.severity === 'warning' ? 'bg-amber-50/60 border-amber-100' :
                  insight.severity === 'success' ? 'bg-emerald-50/60 border-emerald-100' : 'bg-blue-50/60 border-blue-100'
                }`}>
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
              ))}
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
                      <div className="flex items-center gap-2 text-[10px] text-[var(--color-x-text-muted)]">
                        <span className="font-mono">{p.id}</span>
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
        <div className="col-span-12 lg:col-span-5 space-y-3">
          {/* Delivery Forecast */}
          <div className="x-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-indigo-500" /> Delivery Forecast</h3>
              <span className="text-[10px] text-[var(--color-x-text-muted)]">Last 5 months</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gStarted" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} /></linearGradient>
                  <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.15} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.01} /></linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="started" stroke="#6366f1" strokeWidth={2} fill="url(#gStarted)" name="Cumulative Started" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#gCompleted)" name="Cumulative Done" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Department Breakdown */}
          <div className="x-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-blue-500" /> Department Breakdown</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptChartData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="active" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={14} name="Active" />
                <Bar dataKey="done" stackId="a" fill="#10b981" name="Done" />
                <Bar dataKey="delayed" stackId="a" fill="#ef4444" name="Delayed" />
                <Bar dataKey="pending" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right col — Status + Priority + Overloaded */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          {/* Portfolio Status */}
          <div className="x-card p-5">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Eye className="w-4 h-4 text-purple-500" /> Portfolio Status</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[10px] text-[var(--color-x-text-muted)]">{s.name}</span>
                  <span className="text-[10px] font-bold text-[var(--color-x-text)] ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="x-card p-5">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Priority Mix</h3>
            <div className="space-y-2.5">
              {priorityRadial.map(p => {
                const pct = kpi.totalProjects > 0 ? Math.round((p.value / kpi.totalProjects) * 100) : 0;
                return (
                  <div key={p.name}>
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

          {/* Overloaded Team Members */}
          {overloaded.length > 0 && (
            <div className="x-card p-5 border-amber-200">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-amber-500" /> Overloaded</h3>
              <div className="space-y-1.5">
                {overloaded.slice(0, 5).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2 p-1.5 rounded-md">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                      {name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="text-[11px] text-[var(--color-x-text-secondary)] flex-1 truncate">{name}</span>
                    <span className="x-badge x-badge-amber text-[9px]">{count} active</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Milestones / Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="x-card p-5">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-500" /> Upcoming Milestones</h3>
          <div className="space-y-2">
            {projects.filter(p => p.targetDate && p.status !== 'Completed').sort((a, b) => new Date(a.targetDate || '').getTime() - new Date(b.targetDate || '').getTime()).slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-x-bg)] transition-all">
                <span className="text-[10px] font-mono text-[var(--color-x-text-muted)] w-16 flex-shrink-0">{p.targetDate ? new Date(p.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</span>
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

      {/* KPI Drilldown Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--color-x-text)]">{selectedMetric.label} Projects</h2>
                <p className="text-[12px] text-[var(--color-x-text-muted)]">Showing projects matching this criteria</p>
              </div>
              <button onClick={() => setSelectedMetric(null)} className="p-2 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {projects.filter(selectedMetric.filter).map(p => (
                <a key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--color-x-bg)] transition-all border border-transparent hover:border-[var(--color-x-border)] group">
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${p.priority === 'Critical' ? 'bg-red-500' : p.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-x-text)] truncate group-hover:text-indigo-600 transition-colors">{p.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--color-x-text-muted)]">
                      <span className="font-mono bg-[var(--color-x-surface-hover)] px-1.5 py-0.5 rounded">{p.id}</span>
                      <span>{p.department}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.owner}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`x-status-${p.status.toLowerCase().replace(' ', '-')} text-[10px]`}>{p.status}</span>
                    <span className="text-[12px] font-bold text-[var(--color-x-text-secondary)]">{p.progress}%</span>
                  </div>
                </a>
              ))}
              {projects.filter(selectedMetric.filter).length === 0 && (
                <div className="text-center py-12 text-[var(--color-x-text-muted)]">
                  <p>No projects match this criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Department</label>
                <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.department}</p>
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
