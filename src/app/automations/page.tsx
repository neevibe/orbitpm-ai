'use client';

import { Zap, Plus, Settings, Play, Pause, MoreVertical, Puzzle } from 'lucide-react';

const mockAutomations = [
  { id: '1', name: 'Auto-escalate overdue critical projects', trigger: 'When deadline passes', action: 'Change priority to Critical & notify owner', status: 'Active', runs: 142 },
  { id: '2', name: 'Weekly portfolio status digest', trigger: 'Every Friday at 5:00 PM', action: 'Send summary email to Executive team', status: 'Active', runs: 45 },
  { id: '3', name: 'New project onboarding', trigger: 'When project is created', action: 'Create default task template & wiki page', status: 'Paused', runs: 0 },
  { id: '4', name: 'High risk alert', trigger: 'When risk impact is set to Critical', action: 'Post to Slack #portfolio-alerts', status: 'Active', runs: 12 },
];

export default function AutomationsPage() {
  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Automations</h1>
          <p className="x-page-subtitle">Workflow rules and trigger-based actions</p>
        </div>
        <button className="x-btn x-btn-primary"><Plus className="w-4 h-4" /> Create Rule</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Rules', value: '3', icon: Zap, accent: '#f59e0b' },
          { label: 'Executions (30d)', value: '199', icon: Play, accent: '#3b82f6' },
          { label: 'Time Saved', value: '45 hrs', icon: Clock, accent: '#10b981' },
          { label: 'Connected Apps', value: '4', icon: Puzzle, accent: '#8b5cf6' },
        ].map((m, i) => (
          <div key={m.label} className={`x-metric animate-slide-up stagger-${i + 1}`} style={{ '--metric-accent': m.accent } as React.CSSProperties}>
            <m.icon className="w-4 h-4 mb-2" style={{ color: m.accent }} />
            <p className="x-metric-value">{m.value}</p>
            <p className="x-metric-label">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="x-card-flush animate-fade-in">
        <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">Workflow Rules</h3>
        </div>
        <table className="x-table">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Trigger</th>
              <th>Action</th>
              <th>Status</th>
              <th>Runs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mockAutomations.map(rule => (
              <tr key={rule.id}>
                <td className="font-medium text-[var(--color-x-text)]">{rule.name}</td>
                <td className="text-[12px]"><span className="px-1.5 py-0.5 rounded bg-[var(--color-x-bg)] border border-[var(--color-x-border)] font-mono text-[10px] text-[var(--color-x-text-muted)]">IF</span> {rule.trigger}</td>
                <td className="text-[12px]"><span className="px-1.5 py-0.5 rounded bg-[var(--color-x-bg)] border border-[var(--color-x-border)] font-mono text-[10px] text-[var(--color-x-text-muted)]">THEN</span> {rule.action}</td>
                <td>
                  {rule.status === 'Active' ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600"><Play className="w-3 h-3" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500"><Pause className="w-3 h-3" /> Paused</span>
                  )}
                </td>
                <td className="text-[12px]">{rule.runs}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)] rounded"><Settings className="w-4 h-4" /></button>
                    <button className="p-1.5 text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)] rounded"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Clock(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
