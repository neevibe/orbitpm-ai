'use client';

import { Users, AlertTriangle, FolderKanban } from 'lucide-react';
import { useData } from '@/lib/data-context';

export default function TeamPage() {
  const { projects } = useData();
  const ownerMap: Record<string, { name: string; department: string; active: number; total: number; critical: number; delayed: number; projects: string[] }> = {};
  projects.forEach(p => {
    if (!ownerMap[p.owner]) ownerMap[p.owner] = { name: p.owner, department: p.department, active: 0, total: 0, critical: 0, delayed: 0, projects: [] };
    ownerMap[p.owner].total++;
    ownerMap[p.owner].projects.push(p.id);
    if (p.status === 'In Progress') ownerMap[p.owner].active++;
    if (p.priority === 'Critical') ownerMap[p.owner].critical++;
    if (p.status === 'Delayed') ownerMap[p.owner].delayed++;
    ownerMap[p.owner].department = p.department;
  });
  const owners = Object.values(ownerMap).sort((a, b) => b.active - a.active);
  const overloaded = owners.filter(o => o.active >= 15);
  const atCapacity = owners.filter(o => o.active >= 10 && o.active < 15);
  const healthy = owners.filter(o => o.active < 10);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Team Workload</h1>
        <p className="text-[13px] text-[#64748b] mt-0.5">{owners.length} project owners across all departments</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Owners', value: owners.length, icon: Users, bg: 'bg-blue-50', border: 'border-blue-100', color: 'text-blue-500' },
          { label: 'Overloaded (15+)', value: overloaded.length, icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-500' },
          { label: 'At Capacity (10-14)', value: atCapacity.length, icon: FolderKanban, bg: 'bg-amber-50', border: 'border-amber-100', color: 'text-amber-500' },
          { label: 'Healthy (< 10)', value: healthy.length, icon: Users, bg: 'bg-emerald-50', border: 'border-emerald-100', color: 'text-emerald-500' },
        ].map(k => (
          <div key={k.label} className={`glass-card p-4 ${k.bg} border ${k.border}`}>
            <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
            <p className="text-2xl font-bold text-[#0f172a]">{k.value}</p>
            <p className="text-[11px] text-[#64748b] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {owners.map(o => {
          const isOverloaded = o.active >= 15;
          const isAtCapacity = o.active >= 10 && o.active < 15;
          return (
            <div key={o.name} className={`glass-card p-4 ${isOverloaded ? 'border-red-200' : isAtCapacity ? 'border-amber-200' : ''}`}>
              <div className="flex items-start gap-2.5 mb-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  isOverloaded ? 'bg-gradient-to-br from-red-500 to-red-600' :
                  isAtCapacity ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                  'bg-gradient-to-br from-blue-600 to-sky-500'
                }`}>
                  {o.name.split('/')[0].split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#0f172a] truncate">{o.name}</p>
                  <p className="text-[10px] text-[#94a3b8]">{o.department}</p>
                </div>
                {isOverloaded && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-50 text-red-500 rounded border border-red-100">OVERLOADED</span>}
                {!isOverloaded && isAtCapacity && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-600 rounded border border-amber-100">AT CAPACITY</span>}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center"><p className="text-[14px] font-bold text-[#0f172a]">{o.total}</p><p className="text-[9px] text-[#94a3b8]">Total</p></div>
                <div className="text-center"><p className="text-[14px] font-bold text-blue-500">{o.active}</p><p className="text-[9px] text-[#94a3b8]">Active</p></div>
                <div className="text-center"><p className={`text-[14px] font-bold ${o.critical > 0 ? 'text-red-500' : 'text-[#cbd5e1]'}`}>{o.critical}</p><p className="text-[9px] text-[#94a3b8]">Critical</p></div>
                <div className="text-center"><p className={`text-[14px] font-bold ${o.delayed > 0 ? 'text-red-500' : 'text-[#cbd5e1]'}`}>{o.delayed}</p><p className="text-[9px] text-[#94a3b8]">Delayed</p></div>
              </div>
              <div className="mt-2 text-[9px] text-[#94a3b8] font-mono truncate">{o.projects.slice(0, 5).join(', ')}{o.projects.length > 5 ? ` +${o.projects.length - 5}` : ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
