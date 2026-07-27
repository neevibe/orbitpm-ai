'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { plural } from '@/lib/utils';
import { BarChart3, Activity, Target, Download, Settings2, LayoutTemplate, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const { kpi, departments, projects } = useData();
  const [activeTab, setActiveTab] = useState('executive');

  const tabs = [
    { id: 'executive', label: 'Executive Summary', icon: LayoutTemplate },
    { id: 'portfolio', label: 'Portfolio Health', icon: Target },
    { id: 'financial', label: 'Financial Data', icon: Activity },
    { id: 'risk', label: 'Risk Analysis', icon: ShieldAlert },
  ];

  // Real per-month series from live project dates (was hardcoded sample data):
  // "started" = projects whose start date falls in that month, "due" = projects
  // whose target date falls in that month. Last 6 months.
  const trendData = (() => {
    const months: { month: string; started: number; due: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: d.toLocaleDateString('en-IN', { month: 'short' }),
        started: projects.filter(p => !p.archived && p.startDate?.startsWith(ym)).length,
        due: projects.filter(p => !p.archived && p.targetDate?.startsWith(ym)).length,
      });
    }
    return months;
  })();

  const statusData = [
    { name: 'Active', value: kpi.inProgress, color: '#3b82f6' },
    { name: 'Completed', value: kpi.completed, color: '#10b981' },
    { name: 'Delayed', value: kpi.delayed, color: '#ef4444' },
    { name: 'On Hold', value: kpi.onHold, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const deptData = departments.slice(0, 6).map(d => ({
    name: d.name,
    active: d.inProgress,
    done: d.completed,
    delayed: d.delayed
  }));

  const topProjects = projects
    .filter(p => p.status === 'In Progress' && (p.priority === 'Critical' || p.priority === 'High'))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px' };

  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-500" /> Analytics</h1>
          <p className="x-page-subtitle">Executive reporting and business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="x-btn x-btn-secondary"><Settings2 className="w-4 h-4" /> Filters</button>
          <button onClick={() => window.print()} className="x-btn x-btn-primary"><Download className="w-4 h-4" /> Export PDF</button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--color-x-border)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-all ${activeTab === t.id ? 'text-[var(--color-x-accent)] border-[var(--color-x-accent)]' : 'text-[var(--color-x-text-muted)] border-transparent hover:text-[var(--color-x-text-secondary)]'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'executive' && (
        <div className="space-y-4 animate-fade-in">
          {/* Top KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Volume', value: kpi.totalProjects, sub: 'All recorded projects' },
              { label: 'Completion Rate', value: `${kpi.totalProjects > 0 ? Math.round((kpi.completed/kpi.totalProjects)*100) : 0}%`, sub: `${plural(kpi.completed, 'project')} delivered` },
              { label: 'Variance (Delayed)', value: kpi.delayed, sub: 'Projects behind schedule' },
              { label: 'Risk Exposure', value: kpi.openRisks, sub: 'Active logged risks' },
            ].map(m => (
              <div key={m.label} className="x-card p-4">
                <p className="text-[12px] font-semibold text-[var(--color-x-text-secondary)] uppercase tracking-wider">{m.label}</p>
                <p className="text-[24px] font-bold text-[var(--color-x-text)] mt-1">{m.value}</p>
                <p className="text-[11px] text-[var(--color-x-text-muted)] mt-1">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Delivery Trend */}
            <div className="col-span-2 x-card p-5">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4">Delivery Velocity</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={false} />
                  <Area type="monotone" dataKey="due" stroke="#8b5cf6" fill="url(#colorTarget)" name="Deliverables Due" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="started" stroke="#10b981" fill="url(#colorDone)" name="Projects Started" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Status Distribution */}
            <div className="col-span-1 x-card p-5">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4">Status Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-[var(--color-x-text-secondary)]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                    <span className="font-bold text-[var(--color-x-text)]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Department Comparison */}
            <div className="x-card p-5">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4">Department Execution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptData} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} width={150} interval={0} />
                  <Tooltip contentStyle={tooltipStyle} cursor={false} />
                  <Bar dataKey="active" stackId="a" fill="#3b82f6" name="Active" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="done" stackId="a" fill="#10b981" name="Completed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Critical Projects */}
            <div className="x-card-flush">
              <div className="px-5 py-4 border-b border-[var(--color-x-border)]">
                <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">Top Critical Projects (Active)</h3>
              </div>
              <table className="x-table">
                <thead><tr><th>Project</th><th>Owner</th><th>Progress</th></tr></thead>
                <tbody>
                  {topProjects.map(p => (
                    <tr key={p.id}>
                      <td className="max-w-[150px]"><p className="truncate text-[12px] font-medium text-[var(--color-x-text)]">{p.name}</p><p className="text-[10px] text-[var(--color-x-text-muted)]">{p.department}</p></td>
                      <td className="text-[12px]">{p.owner}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 x-progress"><div className="x-progress-bar bg-indigo-500" style={{ width: `${p.progress}%` }} /></div>
                          <span className="text-[11px] font-medium text-[var(--color-x-text-secondary)]">{p.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topProjects.length === 0 && <div className="p-8 text-center text-[var(--color-x-text-muted)] text-[12px]">No critical active projects.</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'executive' && (
        <div className="x-card p-12 text-center animate-fade-in">
          <Activity className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
          <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">Detailed Analytics View</h3>
          <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1">The {tabs.find(t => t.id === activeTab)?.label} dashboard is being provisioned.</p>
        </div>
      )}
    </div>
  );
}
