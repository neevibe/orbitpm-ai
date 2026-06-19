'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Users2, AlertCircle, CheckCircle2, Clock, UserSquare2, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function WorkforcePage() {
  const { projects } = useData();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Extract unique team members from projects owner field
  const teamMap = new Map<string, { name: string; dept: string; active: number; total: number; initials: string; avatarColor: string }>();
  
  const colors = ['from-indigo-500 to-purple-500', 'from-blue-500 to-cyan-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-pink-500 to-rose-500'];
  
  // Workload counts only ACTIVE work: anything not Completed/Cancelled/Archived
  // (i.e. In Progress, Delayed, Not Started/pending-dependency, On Hold).
  const countsAsWorkload = (p: typeof projects[number]) =>
    !p.archived && p.status !== 'Completed' && (p.status as string) !== 'Cancelled';

  projects.forEach(p => {
    if (!p.owner) return;
    const isActive = countsAsWorkload(p);
    if (!teamMap.has(p.owner)) {
      const parts = p.owner.split(' ');
      const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2);
      teamMap.set(p.owner, {
        name: p.owner,
        dept: p.department || 'General',
        active: isActive ? 1 : 0,
        total: 1,
        initials: initials.toUpperCase(),
        avatarColor: colors[p.owner.length % colors.length]
      });
    } else {
      const m = teamMap.get(p.owner)!;
      m.total += 1;
      if (isActive) m.active += 1;
    }
  });

  const team = Array.from(teamMap.values()).sort((a, b) => b.active - a.active);

  // Capacity bands: 0–7 Healthy · 8–12 Moderate · 13+ Overloaded
  const OVERLOAD_THRESHOLD = 13;
  const MODERATE_THRESHOLD = 8;
  const overloaded = team.filter(t => t.active >= OVERLOAD_THRESHOLD).length;
  const atCapacity = team.filter(t => t.active >= MODERATE_THRESHOLD && t.active < OVERLOAD_THRESHOLD).length;
  const available = team.filter(t => t.active < MODERATE_THRESHOLD).length;

  const workloadData = team.slice(0, 10).map(t => ({
    name: t.name.split(' ')[0],
    active: t.active,
    done: t.total - t.active
  }));

  const tooltipStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px' };

  return (
    <div className="x-page space-y-5">
      <div>
        <h1 className="x-page-title flex items-center gap-2"><Users2 className="w-5 h-5 text-emerald-500" /> Workforce</h1>
        <p className="x-page-subtitle">Resource planning and team management</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Team', value: team.length, icon: UserSquare2, accent: '#6366f1' },
          { label: 'Overloaded (13+)', value: overloaded, icon: AlertCircle, accent: '#ef4444' },
          { label: 'Moderate (8–12)', value: atCapacity, icon: Clock, accent: '#f59e0b' },
          { label: 'Healthy (0–7)', value: available, icon: CheckCircle2, accent: '#10b981' },
        ].map((m, i) => (
          <div key={m.label} className={`x-metric animate-slide-up stagger-${i + 1}`} style={{ '--metric-accent': m.accent } as React.CSSProperties}>
            <m.icon className="w-4 h-4 mb-2" style={{ color: m.accent }} />
            <p className="x-metric-value">{m.value}</p>
            <p className="x-metric-label">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Workload Distribution Chart */}
        <div className="col-span-2 x-card p-5 animate-slide-up stagger-5">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4">Workload Distribution (Top 10)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Bar dataKey="active" stackId="a" fill="#3b82f6" name="Active Projects" radius={[0, 0, 4, 4]} barSize={32} />
              <Bar dataKey="done" stackId="a" fill="#e5e7eb" name="Other Projects" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Capacity Heatmap (Simple List) */}
        <div className="col-span-1 x-card p-5 animate-slide-up stagger-6">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3">Capacity Heatmap</h3>
          <div className="space-y-2">
            {team.slice(0, 6).map(t => (
              <div key={t.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-x-bg)]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.active >= 13 ? 'bg-red-500' : t.active >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="text-[12px] font-medium text-[var(--color-x-text)] truncate">{t.name}</span>
                </div>
                <span className="text-[11px] font-bold text-[var(--color-x-text-secondary)]">{t.active} <span className="font-normal text-[var(--color-x-text-muted)]">/ {t.total}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="animate-fade-in">
        <h3 className="text-[14px] font-bold text-[var(--color-x-text)] mb-3">Team Roster</h3>
        <div className="grid grid-cols-4 gap-4">
          {team.map(t => (
            <button 
              key={t.name} 
              onClick={() => setSelectedMember(t.name)}
              className="x-card p-4 hover:border-[var(--color-x-accent)] hover:shadow-md group transition-all text-left w-full cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-[12px] font-bold text-white shadow-sm`}>
                  {t.initials}
                </div>
                {t.active >= 13 && <span className="x-badge x-badge-red text-[9px]">🔴 Overloaded</span>}
                {t.active >= 8 && t.active < 13 && <span className="x-badge x-badge-amber text-[9px]">Moderate</span>}
              </div>
              <h4 className="text-[13px] font-bold text-[var(--color-x-text)] truncate">{t.name}</h4>
              <p className="text-[11px] text-[var(--color-x-text-muted)] truncate mb-3">{t.dept}</p>
              
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-[var(--color-x-text-secondary)] font-medium">Capacity</span>
                <span className="font-bold text-[var(--color-x-text)]">{t.active} <span className="text-[var(--color-x-text-muted)] font-normal">active</span></span>
              </div>
              <div className="x-progress">
                <div className={`x-progress-bar ${t.active >= 13 ? 'bg-red-500' : t.active >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((t.active / 14) * 100, 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Work Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--color-x-text)]">{selectedMember}'s Workload</h2>
                <p className="text-[12px] text-[var(--color-x-text-muted)]">Active projects currently assigned</p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {projects.filter(p => p.owner === selectedMember).map(p => (
                <a key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--color-x-bg)] transition-all border border-transparent hover:border-[var(--color-x-border)] group">
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${p.priority === 'Critical' ? 'bg-red-500' : p.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-x-text)] truncate group-hover:text-indigo-600 transition-colors">{p.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--color-x-text-muted)]">
                      <span className="font-mono bg-[var(--color-x-surface-hover)] px-1.5 py-0.5 rounded">{p.id}</span>
                      <span>{p.department}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`x-status-${p.status.toLowerCase().replace(' ', '-')} text-[10px]`}>{p.status}</span>
                    <span className="text-[12px] font-bold text-[var(--color-x-text-secondary)]">{p.progress}%</span>
                  </div>
                </a>
              ))}
              {projects.filter(p => p.owner === selectedMember).length === 0 && (
                <div className="text-center py-12 text-[var(--color-x-text-muted)]">
                  <p>No projects assigned.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
