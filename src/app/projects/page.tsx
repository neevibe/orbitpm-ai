'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Filter, LayoutGrid, Table2, History, RotateCcw, Trash2, Archive, ChevronDown } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import ProjectModal from '@/components/modals/ProjectModal';
import type { Project } from '@/lib/mock-data';

const STATUS_OPTIONS = ['All', 'In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const PRIORITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function ProjectsPage() {
  const { projects, departments, archiveProject, restoreProject, purgeProject, updateProject } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const deptNames = useMemo(() => ['All', ...departments.map(d => d.name)], [departments]);

  const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
  const archivedProjects = useMemo(() => projects.filter(p => p.archived), [projects]);

  const filtered = useMemo(() => {
    const pool = tab === 'active' ? activeProjects : archivedProjects;
    return pool.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchDept = deptFilter === 'All' || p.department === deptFilter;
      const matchPriority = priorityFilter === 'All' || p.priority === priorityFilter;
      return matchSearch && matchStatus && matchDept && matchPriority;
    });
  }, [activeProjects, archivedProjects, tab, search, statusFilter, deptFilter, priorityFilter]);

  const kanbanGroups = useMemo(() => {
    if (view !== 'kanban' || tab !== 'active') return {};
    const groups: Record<string, Project[]> = { 'Not Started': [], 'In Progress': [], 'Delayed': [], 'Completed': [], 'On Hold': [] };
    filtered.forEach(p => { groups[p.status]?.push(p); });
    return groups;
  }, [filtered, view, tab]);

  const openEdit = (p: Project) => { setEditProject(p); setShowModal(true); };
  const openNew = () => { setEditProject(null); setShowModal(true); };

  const inputCls = "bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-400";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Projects</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            {activeProjects.length} active · {archivedProjects.length} archived
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-[12px]">
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('active')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === 'active' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#64748b] hover:text-[#334155]'}`}>
          <Table2 className="w-3.5 h-3.5" /> Active Projects <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{activeProjects.length}</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === 'history' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#64748b] hover:text-[#334155]'}`}>
          <History className="w-3.5 h-3.5" /> History {archivedProjects.length > 0 && <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{archivedProjects.length}</span>}
        </button>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className={`${inputCls} pl-8 w-full`} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
          {STATUS_OPTIONS.map(s => <option key={s}>{s === 'All' ? 'All Status' : s}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={inputCls}>
          {deptNames.map(d => <option key={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={inputCls}>
          {PRIORITY_OPTIONS.map(p => <option key={p}>{p === 'All' ? 'All Priority' : p}</option>)}
        </select>
        {tab === 'active' && (
          <div className="flex items-center gap-1 ml-auto bg-[#f1f5f9] rounded-lg p-1">
            <button onClick={() => setView('table')} className={`p-1.5 rounded ${view === 'table' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-[#94a3b8]'}`}><Table2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('kanban')} className={`p-1.5 rounded ${view === 'kanban' ? 'bg-white shadow-sm text-[#1e293b]' : 'text-[#94a3b8]'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* ========== HISTORY TAB ========== */}
      {tab === 'history' && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <History className="w-8 h-8 text-[#cbd5e1] mx-auto mb-3" />
              <p className="text-[13px] text-[#94a3b8]">No archived projects yet.</p>
              <p className="text-[11px] text-[#cbd5e1] mt-1">When you archive a project, it appears here for safekeeping.</p>
            </div>
          ) : filtered.map(p => (
            <div key={p.id} className="glass-card p-4 opacity-75 hover:opacity-100 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Archive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#94a3b8]">{p.id}</span>
                      <span className={`status-badge ${getStatusColor(p.status)}`}>{p.status}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-[#334155] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#94a3b8]">{p.department} · {p.owner} · Archived {p.archivedAt ? new Date(p.archivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => restoreProject(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all text-[11px] font-semibold">
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                  <button onClick={() => confirm(`Permanently delete "${p.name}"? This cannot be undone.`) && purgeProject(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all text-[11px] font-semibold">
                    <Trash2 className="w-3 h-3" /> Delete Forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== ACTIVE: TABLE VIEW ========== */}
      {tab === 'active' && view === 'table' && (
        <div className="glass-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Project Name</th>
                <th>Department</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Target Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-[#94a3b8] text-[13px]">No projects match your filters</td></tr>
              )}
              {filtered.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-[#f8fafc] cursor-pointer" onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}>
                    <td className="font-mono text-[11px] text-[#94a3b8]">{p.id}</td>
                    <td className="font-semibold text-[#1e293b] max-w-[280px]">
                      <div className="truncate">{p.name}</div>
                      {(p.supportTeam || p.projectDependencies) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.supportTeam && <span className="text-[9px] text-[#94a3b8]">🤝 {p.supportTeam.split(',')[0].trim()}{p.supportTeam.includes(',') ? '…' : ''}</span>}
                          {p.projectDependencies && <span className="text-[9px] text-indigo-400">🔗 {p.projectDependencies.split(',')[0].trim()}</span>}
                        </div>
                      )}
                    </td>
                    <td className="text-[#475569] text-[12px]">{p.department}</td>
                    <td className="text-[#475569] text-[12px]">{p.owner}</td>
                    <td><span className={`status-badge ${getStatusColor(p.status)}`}>{p.status}</span></td>
                    <td><span className={`priority-badge ${getPriorityColor(p.priority)}`}>{p.priority}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-[11px] text-[#64748b]">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="text-[11px] text-[#94a3b8]">{formatDate(p.targetDate)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => { e.stopPropagation(); openEdit(p); }} className="text-[11px] px-2 py-1 rounded text-[#64748b] hover:bg-[#f1f5f9] transition-all">Edit</button>
                        <button onClick={e => { e.stopPropagation(); archiveProject(p.id); }} className="text-[11px] px-2 py-1 rounded text-amber-500 hover:bg-amber-50 transition-all">Archive</button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded row with quick inline status/priority edit */}
                  {expandedRow === p.id && (
                    <tr key={`${p.id}-expanded`} className="bg-indigo-50/40">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <p className="text-[11px] font-semibold text-[#475569]">Quick Update:</p>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-[#94a3b8] uppercase font-semibold">Status</label>
                            <select defaultValue={p.status} onChange={e => updateProject(p.id, { status: e.target.value as any })}
                              className="text-[12px] bg-white border border-[#e2e8f0] rounded px-2 py-1 text-[#334155] outline-none focus:border-indigo-400">
                              {STATUS_OPTIONS.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-[#94a3b8] uppercase font-semibold">Priority</label>
                            <select defaultValue={p.priority} onChange={e => updateProject(p.id, { priority: e.target.value as any })}
                              className="text-[12px] bg-white border border-[#e2e8f0] rounded px-2 py-1 text-[#334155] outline-none focus:border-indigo-400">
                              {PRIORITY_OPTIONS.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-[#94a3b8] uppercase font-semibold">Progress %</label>
                            <input type="number" min={0} max={100} defaultValue={p.progress} onBlur={e => updateProject(p.id, { progress: Number(e.target.value) })}
                              className="text-[12px] bg-white border border-[#e2e8f0] rounded px-2 py-1 text-[#334155] outline-none focus:border-indigo-400 w-20" />
                          </div>
                          {p.supportTeam && <p className="text-[11px] text-[#64748b]">🤝 <span className="font-medium">{p.supportTeam}</span></p>}
                          {p.projectDependencies && <p className="text-[11px] text-[#64748b]">🔗 Depends on: <span className="font-mono text-indigo-500">{p.projectDependencies}</span></p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== ACTIVE: KANBAN VIEW ========== */}
      {tab === 'active' && view === 'kanban' && (
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(kanbanGroups).map(([status, cols]) => (
            <div key={status} className="glass-card p-3">
              <div className="flex items-center justify-between mb-3">
                <span className={`status-badge ${getStatusColor(status)} text-[10px]`}>{status}</span>
                <span className="text-[10px] text-[#94a3b8] font-mono">{cols.length}</span>
              </div>
              <div className="space-y-2">
                {cols.map(p => (
                  <div key={p.id} onClick={() => openEdit(p)} className="p-2.5 bg-white rounded-lg border border-[#f1f5f9] hover:border-indigo-200 hover:shadow-sm cursor-pointer transition-all">
                    <p className="text-[10px] font-mono text-[#94a3b8] mb-0.5">{p.id}</p>
                    <p className="text-[12px] font-semibold text-[#1e293b] leading-snug line-clamp-2">{p.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`priority-badge ${getPriorityColor(p.priority)} text-[9px] py-0`}>{p.priority}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-10 h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-[9px] text-[#94a3b8]">{p.progress}%</span>
                      </div>
                    </div>
                    {p.projectDependencies && <p className="text-[9px] text-indigo-400 mt-1 truncate">🔗 {p.projectDependencies}</p>}
                  </div>
                ))}
                {cols.length === 0 && <p className="text-center text-[11px] text-[#e2e8f0] py-4">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectModal isOpen={showModal} onClose={() => { setShowModal(false); setEditProject(null); }} editProject={editProject} />
    </div>
  );
}
