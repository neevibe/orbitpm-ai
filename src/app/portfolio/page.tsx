'use client';
import React, { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Briefcase, Activity, Target, PieChart, TrendingUp, AlertTriangle, Plus, ShieldCheck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';

export default function PortfolioPage() {
  const { projects, risks, departments, kpi } = useData();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [okrs, setOkrs] = useState<any[]>([]);
  
  // Example "isAdmin" toggle just to demonstrate Admin control visually for MVP
  const [isAdmin] = useState(true); 

  // Compute total investment from budgets if they exist
  const totalInvestment = budgets.reduce((acc, b) => acc + b.allocated, 0);

  // 5x5 Risk Matrix Data
  const riskImpactMap: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4, 'Severe': 5 };
  const riskMatrixData = risks.map(r => {
    // Generate a mock likelihood based on ID to keep it consistent
    const likelihood = (r.id.charCodeAt(r.id.length - 1) % 5) + 1;
    return {
      id: r.id,
      name: r.description,
      impact: riskImpactMap[r.impact] || 3,
      likelihood,
      severity: r.impact
    };
  });

  const getRiskColor = (impact: number, likelihood: number) => {
    const score = impact * likelihood;
    if (score >= 15) return '#ef4444'; // Red (High)
    if (score >= 8) return '#f59e0b'; // Amber (Medium)
    return '#10b981'; // Green (Low)
  };

  const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px' };

  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Briefcase className="w-5 h-5 text-purple-500" /> Portfolio</h1>
          <p className="x-page-subtitle">Strategic planning and program management</p>
        </div>
        {isAdmin && (
          <button className="x-btn x-btn-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Admin: Scaffold Portfolio
          </button>
        )}
      </div>

      {/* Strategic Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Investment', value: budgets.length ? `$${totalInvestment}M` : '$0M', icon: PieChart, accent: '#8b5cf6', sub: 'Allocated budget' },
          { label: 'Programs', value: departments.length, icon: Target, accent: '#3b82f6', sub: 'Business units' },
          { label: 'Active Execution', value: kpi.inProgress, icon: Activity, accent: '#10b981', sub: 'In progress' },
          { label: 'Portfolio Health', value: kpi.totalProjects > 0 ? `${Math.round((kpi.completed / kpi.totalProjects) * 100)}%` : '0%', icon: TrendingUp, accent: '#6366f1', sub: 'Overall completion' },
        ].map((m, i) => (
          <div key={m.label} className={`x-metric animate-slide-up stagger-${i + 1}`} style={{ '--metric-accent': m.accent } as React.CSSProperties}>
            <m.icon className="w-4 h-4 mb-2" style={{ color: m.accent }} />
            <p className="x-metric-value">{m.value}</p>
            <p className="x-metric-label">{m.label}</p>
            <p className="text-[10px] text-[var(--color-x-text-muted)] mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Budget Planning View */}
        <div className="x-card p-5 animate-slide-up stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><PieChart className="w-4 h-4 text-purple-500" /> Budget Utilization</h3>
            {isAdmin && <button className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add Budget</button>}
          </div>
          {budgets.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={budgets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="spent" stackId="a" fill="#8b5cf6" name="Spent" radius={[0, 0, 4, 4]} />
                <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" name="Remaining" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-center border-2 border-dashed border-[var(--color-x-border)] rounded-xl bg-[var(--color-x-bg)]">
              <PieChart className="w-8 h-8 text-[var(--color-x-text-muted)] mb-2 opacity-50" />
              <p className="text-[12px] font-medium text-[var(--color-x-text)]">No Budgets Defined</p>
              <p className="text-[11px] text-[var(--color-x-text-muted)] mt-1 max-w-[200px]">Portfolio budgets are empty. An administrator must allocate funds.</p>
            </div>
          )}
        </div>

        {/* 5x5 Risk Matrix */}
        <div className="x-card p-5 animate-slide-up stagger-6">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Enterprise Risk Matrix</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <XAxis type="number" dataKey="likelihood" name="Likelihood" domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} label={{ value: 'Likelihood', position: 'bottom', fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis type="number" dataKey="impact" name="Impact" domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} label={{ value: 'Impact', angle: -90, position: 'left', fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <ZAxis type="number" range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle}
                formatter={(val: any, name: any, props: any) => [props.payload.name, name === 'impact' ? 'Impact' : 'Likelihood']}
              />
              <Scatter data={riskMatrixData}>
                {riskMatrixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(entry.impact, entry.likelihood)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Performance Cards */}
      <div className="space-y-3 animate-fade-in">
        <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">Department Performance</h3>
        <div className="grid grid-cols-3 gap-4">
          {departments.slice(0, 6).map(dept => {
            const pct = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
            return (
              <div key={dept.name} className="x-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-semibold text-[var(--color-x-text)] truncate">{dept.name}</h4>
                  <span className="text-[11px] font-bold text-[var(--color-x-accent)]">{pct}%</span>
                </div>
                <div className="x-progress mb-3"><div className="x-progress-bar bg-[var(--color-x-accent)]" style={{ width: `${pct}%` }} /></div>
                <div className="flex items-center justify-between text-[11px] text-[var(--color-x-text-muted)]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> {dept.inProgress} Active</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {dept.completed} Done</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {dept.delayed} Delayed</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OKR Tracker */}
      <div className="x-card p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><Target className="w-4 h-4 text-emerald-500" /> Strategic OKRs</h3>
          {isAdmin && <button className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add OKR</button>}
        </div>
        {okrs.length > 0 ? (
          <div className="space-y-4">
            {okrs.map((okr, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--color-x-border)] bg-[var(--color-x-bg)]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold text-[var(--color-x-text)]">{okr.obj}</h4>
                  <span className={`x-badge ${okr.progress >= 70 ? 'x-badge-green' : okr.progress >= 40 ? 'x-badge-blue' : 'x-badge-amber'}`}>{okr.progress}%</span>
                </div>
                <div className="x-progress mb-3"><div className={`x-progress-bar ${okr.progress >= 70 ? 'bg-emerald-500' : okr.progress >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${okr.progress}%` }} /></div>
                <div className="space-y-1">
                  {okr.krs.map((kr: string, i: number) => (
                    <p key={i} className="text-[11px] text-[var(--color-x-text-secondary)] flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[var(--color-x-border-hover)]" /> {kr}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] text-center border-2 border-dashed border-[var(--color-x-border)] rounded-xl bg-[var(--color-x-bg)]">
            <Target className="w-6 h-6 text-[var(--color-x-text-muted)] mb-2 opacity-50" />
            <p className="text-[12px] font-medium text-[var(--color-x-text)]">No Objectives Defined</p>
          </div>
        )}
      </div>
    </div>
  );
}
