'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Zap, Target, Users, AlertCircle, Shield, Eye, X, Sparkles, Edit3, Save, Calendar, Trash2
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import type { Project } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[#1e293b] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px] text-[#64748b]">
          <span style={{ color: p.color }}>●</span> {p.name}: <span className="text-[#1e293b] font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const statusOptions = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, departments, risks, kpi, updateProject } = useData();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [isEditing, setIsEditing] = useState(false);

  // "Stuck projects" = Deadlines reaching in <= 7 days, any priority, not completed, not dismissed
  const stuckProjects = useMemo(() =>
    projects.filter(p => {
      if (p.status === 'Completed' || p.archived || p.dismissedFromStuck) return false;
      const days = daysUntil(p.targetDate);
      return days !== null && days <= 7;
    }).sort((a, b) => {
      const da = daysUntil(a.targetDate) ?? 999;
      const db = daysUntil(b.targetDate) ?? 999;
      return da - db;
    }),
    [projects]
  );

  const dynamicTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const trend = [];
    
    for (let i = 0; i < 6; i++) {
      let dMonth = currentMonth + i;
      let dYear = currentYear;
      if (dMonth > 11) { dMonth -= 12; dYear += 1; }
      const mName = months[dMonth] + " '" + dYear.toString().substring(2);
      const dueThisMonth = projects.filter(p => {
        if (!p.targetDate) return false;
        const pt = new Date(p.targetDate);
        return pt.getMonth() === dMonth && pt.getFullYear() === dYear;
      });
      trend.push({ month: mName, projectsDue: dueThisMonth.length, delayed: dueThisMonth.filter(p => p.status === 'Delayed').length });
    }
    return trend;
  }, [projects]);

  const kpiCards = [
    { label: 'Total Projects', value: kpi.totalProjects, icon: BarChart3, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', filter: 'all' },
    { label: 'In Progress', value: kpi.inProgress, icon: TrendingUp, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', filter: 'In Progress' },
    { label: 'Completed', value: kpi.completed, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', filter: 'Completed' },
    { label: 'Delayed', value: kpi.delayed, icon: Clock, iconBg: 'bg-red-50', iconColor: 'text-red-500', alert: true, filter: 'Delayed' },
    { label: 'Not Started', value: kpi.notStarted, icon: Target, iconBg: 'bg-slate-50', iconColor: 'text-slate-500', filter: 'Not Started' },
    { label: 'Open Risks', value: kpi.openRisks, icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', alert: true, filter: 'risks' },
  ];

  const ccoCards = [
    { label: 'Stuck Projects', value: stuckProjects.length, desc: 'Deadlines reaching in ≤7 days', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', filter: 'stuck' },
    { label: 'Needs Escalation', value: kpi.needsEscalation, desc: 'Critical + In Progress + Has Risks', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', filter: 'escalation' },
    { label: 'Owner Bottlenecks', value: kpi.ownerBottlenecks, desc: 'Owners with 3+ active projects', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', filter: 'bottlenecks' },
  ];

  const filteredProjects = projects.filter(p => {
    if (!activeFilter || activeFilter === 'all') return true;
    if (activeFilter === 'risks') return risks.some(r => r.projectId === p.id && r.status === 'Open');
    if (activeFilter === 'stuck') return stuckProjects.some(a => a.id === p.id);
    if (activeFilter === 'escalation') return p.priority === 'Critical' && p.status === 'In Progress' && risks.some(r => r.projectId === p.id && r.status === 'Open');
    if (activeFilter === 'bottlenecks') return false;
    return p.status === activeFilter;
  });

  const filteredDepartments = departments.map(d => {
    const deptProjects = projects.filter(p => p.department === d.name);
    const matched = deptProjects.filter(p => {
      if (!activeFilter || activeFilter === 'all') return true;
      if (activeFilter === 'risks') return risks.some(r => r.projectId === p.id && r.status === 'Open');
      if (activeFilter === 'stuck') return stuckProjects.some(a => a.id === p.id);
      if (activeFilter === 'escalation') return p.priority === 'Critical' && p.status === 'In Progress' && risks.some(r => r.projectId === p.id && r.status === 'Open');
      return p.status === activeFilter;
    });
    return { ...d, matchedCount: matched.length };
  }).filter(d => !activeFilter || activeFilter === 'all' || d.matchedCount > 0);

  const pieData = [
    { name: 'In Progress', value: kpi.inProgress, color: '#3b82f6' },
    { name: 'Not Started', value: kpi.notStarted, color: '#94a3b8' },
    { name: 'Completed', value: kpi.completed, color: '#10b981' },
    { name: 'Delayed', value: kpi.delayed, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const criticalProjects = projects.filter(p => p.priority === 'Critical' && p.status === 'In Progress');

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

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Executive Dashboard</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Commercial Department · Portfolio Overview</p>
        </div>
        <div className="flex items-center gap-3">
          {activeFilter && (
            <button 
              onClick={() => setActiveFilter(null)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear Filter: {activeFilter}
            </button>
          )}
          <span className="text-[11px] text-[#94a3b8] font-medium">Live · {kpi.totalProjects} projects</span>
          <button className="btn-primary text-[12px] py-2 px-3"><Eye className="w-3.5 h-3.5" /> Generate Report</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        {kpiCards.map((card, i) => (
          <button 
            key={card.label} 
            onClick={() => setActiveFilter(card.filter)}
            className={`kpi-card group animate-slide-up text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${activeFilter === card.filter ? 'ring-2 ring-indigo-500 bg-white shadow-lg' : ''}`} 
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between mb-2.5">
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              {card.alert && card.value > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-[#0f172a] tracking-tight">{card.value}</p>
            <p className="text-[11px] font-medium text-[#94a3b8] mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {/* CCO Decision View */}
      <div className="glass-card p-4">
        <h2 className="text-[12px] font-semibold text-[#64748b] mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Target className="w-3.5 h-3.5 text-indigo-500" />
          CCO Decision View — Focus Areas
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {ccoCards.map((card) => (
            <button 
              key={card.label} 
              onClick={() => setActiveFilter(card.filter)}
              className={`${card.bg} rounded-xl p-4 border transition-all hover:shadow-md active:scale-[0.98] text-left ${activeFilter === card.filter ? 'ring-2 ring-indigo-500 ' + card.border : card.border}`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-2xl font-bold text-[#0f172a]">{card.value}</span>
              </div>
              <p className="text-[12px] font-semibold text-[#334155]">{card.label}</p>
              <p className="text-[10px] text-[#94a3b8] mt-0.5">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drill-down Results */}
      {activeFilter && (
        <div className="glass-card p-4 animate-scale-in border-indigo-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-[#0f172a] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {activeFilter === 'stuck'
                ? `${filteredProjects.length} Stuck Projects (Deadline ≤ 7 days)`
                : `${filteredProjects.length} Projects matching "${activeFilter}"`}
            </h3>
            <button onClick={() => setActiveFilter(null)} className="text-[11px] text-[#94a3b8] hover:text-[#64748b]">Dismiss</button>
          </div>
          <div className="max-h-[340px] overflow-y-auto pr-2 space-y-2">
            {filteredProjects.map(p => {
              const days = daysUntil(p.targetDate);
              const isOverdue = days !== null && days < 0;
              const isUrgent = days !== null && days <= 7;
              return (
                <div
                  key={p.id}
                  onClick={() => openPanel(p)}
                  className="flex items-center justify-between p-3 bg-white border border-[#f1f5f9] rounded-lg hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : isUrgent ? 'bg-orange-400' : p.status === 'Delayed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#1e293b] group-hover:text-indigo-700 transition-colors truncate">{p.name}</p>
                      <p className="text-[10px] text-[#64748b]">{p.id} · {p.department} · {p.owner}</p>
                      {days !== null && (
                        <p className={`text-[10px] font-bold mt-0.5 ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-500' : 'text-amber-600'}`}>
                          {isOverdue ? `⚠️ Overdue by ${Math.abs(days)} days` : `⏰ ${days} day${days !== 1 ? 's' : ''} remaining`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-[#0f172a]">{p.progress}%</p>
                      <p className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${
                        p.priority === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-[#64748b]'
                      }`}>{p.priority}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFilter === 'stuck' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProject(p.id, { dismissedFromStuck: true });
                          }}
                          title="Remove from Stuck list"
                          className="flex items-center justify-center p-1 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 text-indigo-600 text-[11px] font-bold group-hover:bg-indigo-100 transition-colors">
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <p className="text-center text-[12px] text-[#94a3b8] py-6">No projects match this filter ✅</p>
            )}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 glass-card p-4">
          <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Upcoming Project Deadlines (Live)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dynamicTrend}>
              <defs>
                <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d65ff" stopOpacity={0.15} /><stop offset="95%" stopColor="#2d65ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="projectsDue" name="Projects Due" stroke="#2d65ff" fill="url(#colorDue)" strokeWidth={2} />
              <Area type="monotone" dataKey="delayed" name="Delayed Projects" stroke="#ef4444" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-4">
          <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="42%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={6}
                formatter={(value: string) => <span className="text-[11px] text-[#64748b] ml-1">{value}</span>} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#f1f5f9]">
          <h3 className="text-[12px] font-semibold text-[#334155]">Project Status by Department</h3>
          <p className="text-[10px] text-[#94a3b8] mt-0.5">Auto-calculated from project data · Updates in real-time</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Department</th><th className="text-center">Total</th><th className="text-center">In Progress</th>
              <th className="text-center">Completed</th><th className="text-center">Not Started</th>
              <th className="text-center">Delayed</th><th className="text-center">Critical</th><th className="text-center">% Done</th>
            </tr></thead>
            <tbody>
              {filteredDepartments.map((d) => (
                <tr key={d.name} className={activeFilter ? 'bg-indigo-50/30' : ''}>
                  <td><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="font-medium text-[#1e293b] text-[13px]">{d.name}</span></div></td>
                  <td className="text-center font-semibold text-[#0f172a]">{activeFilter && activeFilter !== 'all' ? d.matchedCount : d.total}</td>
                  <td className="text-center"><span className="text-blue-600">{d.inProgress}</span></td>
                  <td className="text-center"><span className="text-emerald-600">{d.completed}</span></td>
                  <td className="text-center"><span className="text-[#94a3b8]">{d.notStarted}</span></td>
                  <td className="text-center">{d.delayed > 0 ? <span className="text-red-500 font-semibold">{d.delayed}</span> : <span className="text-[#cbd5e1]">0</span>}</td>
                  <td className="text-center">{d.critical > 0 ? <span className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px] font-bold border border-red-100">{d.critical}</span> : <span className="text-[#cbd5e1]">0</span>}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-14 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.pctDone}%` }} /></div>
                      <span className="text-[10px] text-[#94a3b8] w-7">{d.pctDone}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#e2e8f0] bg-[#f8fafc]">
                <td className="font-bold text-[#0f172a]">Grand Total</td>
                <td className="text-center font-bold text-[#0f172a] text-[15px]">{kpi.totalProjects}</td>
                <td className="text-center font-bold text-blue-600">{kpi.inProgress}</td>
                <td className="text-center font-bold text-emerald-600">{kpi.completed}</td>
                <td className="text-center font-bold text-[#64748b]">{kpi.notStarted}</td>
                <td className="text-center font-bold text-red-500">{kpi.delayed}</td>
                <td className="text-center font-bold text-red-500">{kpi.critical}</td>
                <td className="text-center text-[10px] text-[#94a3b8]">{kpi.totalProjects > 0 ? Math.round((kpi.completed / kpi.totalProjects) * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Projects + Risk Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f1f5f9] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <h3 className="text-[12px] font-semibold text-[#334155]">Critical In-Progress Projects</h3>
          </div>
          <div className="divide-y divide-[#f8fafc]">
            {criticalProjects.slice(0, 6).map((p) => {
              const days = daysUntil(p.targetDate);
              return (
                <div
                  key={p.id}
                  onClick={() => openPanel(p)}
                  className="px-4 py-2.5 hover:bg-indigo-50/40 hover:border-l-2 hover:border-indigo-400 transition-all flex items-center gap-3 cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-[#94a3b8]">{p.id}</span>
                      <span className="priority-badge critical text-[8px] py-0">CRITICAL</span>
                      {days !== null && days <= 14 && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${days < 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          {days < 0 ? `OVERDUE` : `${days}d left`}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-[#334155] truncate group-hover:text-indigo-700">{p.name}</p>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">{p.owner} · {p.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-[#64748b]">{p.progress}%</p>
                    </div>
                    <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 text-indigo-600 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit3 className="w-3 h-3" /> Edit
                    </div>
                  </div>
                </div>
              );
            })}
            {criticalProjects.length === 0 && (
              <div className="px-4 py-6 text-center"><p className="text-[12px] text-[#94a3b8]">No critical in-progress projects ✅</p></div>
            )}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f1f5f9] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-[12px] font-semibold text-[#334155]">Active Risks Summary</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center"><p className="text-xl font-bold text-[#0f172a]">{kpi.totalRisks}</p><p className="text-[10px] text-[#94a3b8] mt-0.5">Total</p></div>
              <div className="text-center"><p className="text-xl font-bold text-amber-500">{kpi.openRisks}</p><p className="text-[10px] text-[#94a3b8] mt-0.5">Open</p></div>
              <div className="text-center"><p className="text-xl font-bold text-red-500">{risks.filter(r => r.impact === 'High' && r.status === 'Open').length}</p><p className="text-[10px] text-[#94a3b8] mt-0.5">High</p></div>
              <div className="text-center"><p className="text-xl font-bold text-emerald-500">{kpi.closedRisks}</p><p className="text-[10px] text-[#94a3b8] mt-0.5">Closed</p></div>
            </div>
            <div className="space-y-2">
              {risks.filter(r => r.status === 'Open').slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                  <div className={`w-1 h-7 rounded-full ${r.impact === 'High' ? 'bg-red-400' : r.impact === 'Medium' ? 'bg-amber-400' : 'bg-green-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[#334155] truncate">{r.description}</p>
                    <p className="text-[10px] text-[#94a3b8]">{r.projectId} · {r.category}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b]">{r.impact}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight Banner */}
      <div className="glass-card p-4 border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-indigo-700 mb-0.5">AI Executive Summary</h3>
            <p className="text-[12px] text-[#475569] leading-relaxed">
              The Commercial Department has <span className="text-[#0f172a] font-semibold">{kpi.totalProjects} active projects</span> across {departments.length} departments.
              {kpi.delayed > 0 && <><span className="text-red-600 font-semibold"> {kpi.delayed} project{kpi.delayed > 1 ? 's are' : ' is'} delayed</span> and</>}
              <span className="text-amber-600 font-semibold"> {kpi.critical} are marked critical</span>.
              {stuckProjects.length > 0 && <><span className="text-red-600 font-semibold"> {stuckProjects.length} project{stuckProjects.length !== 1 ? 's' : ''}</span> are approaching their deadline within 7 days and require immediate attention.</>}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Edit Side Panel */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedProject(null)}>
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
              {/* Deadline Alert */}
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

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Status</label>
                {isEditing ? (
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))} className="x-input w-full">
                    {statusOptions.map(s => <option key={s}>{s}</option>)}
                  </select>
                ) : (
                  <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.status}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Priority</label>
                {isEditing ? (
                  <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as any }))} className="x-input w-full">
                    {priorityOptions.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.priority}</p>
                )}
              </div>

              {/* Progress */}
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

              {/* Owner */}
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Owner</label>
                {isEditing ? (
                  <input value={editForm.owner || ''} onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))} className="x-input w-full" />
                ) : (
                  <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.owner || '—'}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wider">Department</label>
                <p className="text-[13px] font-semibold text-[#1e293b]">{selectedProject.department}</p>
              </div>

              {/* Full detail button */}
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
