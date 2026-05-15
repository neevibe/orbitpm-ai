'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils';
import ProjectModal from '@/components/modals/ProjectModal';
import type { Project } from '@/lib/mock-data';

type ViewMode = 'table' | 'kanban';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects } = useData();
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchDept = deptFilter === 'All' || p.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const depts = ['All', ...Array.from(new Set(projects.map(p => p.department)))];
  const statuses = ['All', 'In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
  const statusGroups = ['In Progress', 'Not Started', 'Completed', 'Delayed'] as const;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Projects</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">{projects.length} projects across all departments</p>
        </div>
        <button onClick={() => { setEditProject(null); setShowModal(true); }} className="btn-primary text-[12px]"><Plus className="w-3.5 h-3.5" /> New Project</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)}
            className="search-input w-full text-[13px]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
          {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
          {depts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>
        <div className="flex items-center bg-white border border-[#e2e8f0] rounded-lg p-0.5">
          <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-indigo-50 text-indigo-500' : 'text-[#94a3b8] hover:text-[#64748b]'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-indigo-50 text-indigo-500' : 'text-[#94a3b8] hover:text-[#64748b]'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project ID</th><th>Project Name</th><th>Department</th>
                  <th>Owner</th><th>Status</th><th>Progress</th><th>Priority</th>
                  <th>Start</th><th>Target</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                    <td><span className="font-mono text-[11px] text-indigo-500 font-medium">{p.id}</span></td>
                    <td><span className="font-medium text-[#1e293b]">{p.name}</span></td>
                    <td><span className="text-[#64748b]">{p.department}</span></td>
                    <td><span className="text-[#475569]">{p.owner}</span></td>
                    <td><span className={`status-badge ${getStatusColor(p.status)}`}>{p.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p.progress > 50 ? 'bg-emerald-500' : p.progress > 0 ? 'bg-blue-500' : 'bg-[#e2e8f0]'}`} style={{ width: `${Math.max(p.progress, 2)}%` }} />
                        </div>
                        <span className="text-[11px] text-[#94a3b8] w-7">{p.progress}%</span>
                      </div>
                    </td>
                    <td><span className={`priority-badge ${getPriorityColor(p.priority)}`}>{p.priority}</span></td>
                    <td className="text-[#94a3b8] text-[11px]">{formatDate(p.startDate)}</td>
                    <td className="text-[#94a3b8] text-[11px]">{formatDate(p.targetDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {statusGroups.map(status => {
            const groupProjects = filtered.filter(p => p.status === status);
            return (
              <div key={status} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'In Progress' ? 'bg-blue-500' : status === 'Completed' ? 'bg-emerald-500' :
                    status === 'Delayed' ? 'bg-red-500' : 'bg-[#94a3b8]'
                  }`} />
                  <span className="text-[12px] font-semibold text-[#334155]">{status}</span>
                  <span className="ml-auto text-[10px] text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded">{groupProjects.length}</span>
                </div>
                <div className="space-y-2">
                  {groupProjects.map(p => (
                    <div key={p.id} className="glass-card p-3 cursor-pointer hover:border-indigo-200" onClick={() => router.push(`/projects/${p.id}`)}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-mono text-[#94a3b8]">{p.id}</span>
                        <span className={`priority-badge ${getPriorityColor(p.priority)} text-[8px] py-0`}>{p.priority}</span>
                      </div>
                      <p className="text-[12px] font-medium text-[#334155] leading-snug mb-2">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#94a3b8]">{p.owner}</span>
                        <span className="text-[10px] font-medium text-[#64748b]">{p.progress}%</span>
                      </div>
                      <div className="mt-1.5 w-full h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectModal isOpen={showModal} onClose={() => setShowModal(false)} editProject={editProject} />
    </div>
  );
}
