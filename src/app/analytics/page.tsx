'use client';

import { useData } from '@/lib/data-context';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, Users, Target, Zap } from 'lucide-react';

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

export default function AnalyticsPage() {
  const { projects, departments, risks, kpi } = useData();

  // Department breakdown for stacked bar
  const deptData = departments.map(d => ({
    name: d.name.length > 18 ? d.name.substring(0, 16) + '…' : d.name,
    fullName: d.name,
    'In Progress': d.inProgress,
    'Completed': d.completed,
    'Not Started': d.notStarted,
    'Delayed': d.delayed,
    pctDone: d.pctDone,
    color: d.color,
  })).filter(d => d['In Progress'] + d['Completed'] + d['Not Started'] + d['Delayed'] > 0);

  // Priority breakdown
  const priorityData = [
    { name: 'Critical', value: kpi.critical, color: '#ef4444' },
    { name: 'High', value: kpi.high, color: '#f97316' },
    { name: 'Medium', value: kpi.medium, color: '#eab308' },
    { name: 'Low', value: kpi.low, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // Status breakdown
  const statusData = [
    { name: 'In Progress', value: kpi.inProgress, color: '#3b82f6' },
    { name: 'Not Started', value: kpi.notStarted, color: '#94a3b8' },
    { name: 'Completed', value: kpi.completed, color: '#10b981' },
    { name: 'Delayed', value: kpi.delayed, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Radar data for department health
  const radarData = departments.slice(0, 6).map(d => ({
    dept: d.name.length > 12 ? d.name.substring(0, 10) + '…' : d.name,
    'Completion %': d.pctDone,
    'In Progress': d.total > 0 ? Math.round((d.inProgress / d.total) * 100) : 0,
    'Risk Score': d.delayed > 0 ? Math.round((d.delayed / d.total) * 100) : 0,
  }));

  // Owner workload
  const ownerMap: Record<string, number> = {};
  projects.filter(p => p.status === 'In Progress').forEach(p => {
    if (p.owner) ownerMap[p.owner] = (ownerMap[p.owner] || 0) + 1;
  });
  const ownerData = Object.entries(ownerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name: name.split('/')[0].trim().split(' ')[0],
      fullName: name,
      count,
      color: count >= 5 ? '#ef4444' : count >= 3 ? '#f97316' : '#6366f1',
    }));

  const overallCompletionPct = kpi.totalProjects > 0 ? Math.round((kpi.completed / kpi.totalProjects) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Analytics</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Portfolio intelligence · {kpi.totalProjects} projects across {departments.filter(d => d.total > 0).length} departments</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
          <Zap className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[12px] font-semibold text-indigo-600">Live Data</span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Portfolio Size', value: kpi.totalProjects, icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Completion Rate', value: `${overallCompletionPct}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Active Projects', value: kpi.inProgress, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Open Risks', value: kpi.openRisks, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Owner Bottlenecks', value: kpi.ownerBottlenecks, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(k => (
          <div key={k.label} className="glass-card p-4">
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-[#0f172a]">{k.value}</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-3">
        {/* Department Stacked Bar */}
        <div className="col-span-2 glass-card p-4">
          <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Projects by Department & Status</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '10px', color: '#64748b' }} />
              <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" radius={0} />
              <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={0} />
              <Bar dataKey="Not Started" stackId="a" fill="#e2e8f0" radius={0} />
              <Bar dataKey="Delayed" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Pie */}
        <div className="glass-card p-4">
          <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="44%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                {priorityData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={6}
                formatter={(value: string) => <span className="text-[10px] text-[#64748b] ml-1">{value}</span>} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Owner Workload */}
        <div className="glass-card p-4">
          <h3 className="text-[12px] font-semibold text-[#334155] mb-1">Owner Workload (Active Projects)</h3>
          <p className="text-[10px] text-[#94a3b8] mb-3">🔴 Overloaded (5+) · 🟠 At Capacity (3-4) · 🟣 Healthy</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ownerData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Active Projects" radius={[0, 4, 4, 0]} barSize={14}>
                {ownerData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Completion Heatmap */}
        <div className="glass-card p-4">
          <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Department Completion Rate</h3>
          <div className="space-y-2.5">
            {departments.filter(d => d.total > 0).sort((a, b) => b.pctDone - a.pctDone).map(d => (
              <div key={d.name} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-[11px] text-[#475569] w-40 truncate flex-shrink-0">{d.name}</span>
                <div className="flex-1 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${d.pctDone}%`,
                      background: d.pctDone >= 50 ? '#10b981' : d.pctDone >= 20 ? '#6366f1' : '#f59e0b',
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#94a3b8] w-8 text-right">{d.pctDone}%</span>
                <span className="text-[10px] text-[#cbd5e1] w-12 text-right font-mono">{d.total} proj</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Analytics */}
      <div className="glass-card p-4">
        <h3 className="text-[12px] font-semibold text-[#334155] mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Risk Register Analytics
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {['Technical', 'Operational', 'Vendor', 'Compliance'].map(category => {
            const count = risks.filter(r => r.category === category).length;
            const open = risks.filter(r => r.category === category && r.status === 'Open').length;
            const high = risks.filter(r => r.category === category && r.impact === 'High').length;
            return (
              <div key={category} className="p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                <p className="text-[11px] font-semibold text-[#334155] mb-2">{category}</p>
                <p className="text-xl font-bold text-[#0f172a]">{count}</p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5">{open} open · {high} high</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
