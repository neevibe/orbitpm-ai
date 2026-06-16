'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, LayoutGrid, Table2, History, RotateCcw, Trash2, Archive, BarChartHorizontal, ChevronDown, ChevronRight, MoreVertical, Edit2, FolderOpen } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import ProjectModal from '@/components/modals/ProjectModal';
import type { Project } from '@/lib/mock-data';

const STATUS_OPTIONS = ['All', 'In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const PRIORITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low'];

function statusDot(status: string) {
  if (status === 'In Progress') return 'bg-blue-500';
  if (status === 'Completed') return 'bg-emerald-500';
  if (status === 'Delayed') return 'bg-red-500';
  if (status === 'On Hold') return 'bg-amber-400';
  return 'bg-gray-300';
}

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, departments, archiveProject, restoreProject, purgeProject, updateProject } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [view, setView] = useState<'list' | 'kanban' | 'gantt'>('list');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newProjectDept, setNewProjectDept] = useState<string | null>(null);

  const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
  const archivedProjects = useMemo(() => projects.filter(p => p.archived), [projects]);

  const filtered = useMemo(() => {
    const pool = tab === 'active' ? activeProjects : archivedProjects;
    return pool.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchDept = selectedDept === 'All' || p.department === selectedDept;
      const matchPriority = priorityFilter === 'All' || p.priority === priorityFilter;
      return matchSearch && matchStatus && matchDept && matchPriority;
    });
  }, [activeProjects, archivedProjects, tab, search, statusFilter, selectedDept, priorityFilter]);

  const deptGroups = useMemo(() => {
    const groups: Record<string, Project[]> = {};
    filtered.forEach(p => {
      if (!groups[p.department]) groups[p.department] = [];
      groups[p.department].push(p);
    });
    return groups;
  }, [filtered]);

  const deptList = useMemo(() => departments.map(d => d.name).sort(), [departments]);

  const toggleCollapse = (dept: string) => {
    setCollapsedDepts(prev => {
      const n = new Set(prev);
      if (n.has(dept)) n.delete(dept); else n.add(dept);
      return n;
    });
  };

  const openNew = (dept?: string) => {
    setEditProject(null);
    setNewProjectDept(dept || null);
    setShowModal(true);
  };

  const openEdit = (p: Project) => { setEditProject(p); setShowModal(true); };
  const goToDetail = (id: string) => router.push(`/projects/${id}`);

  return (
    <div className="flex flex-1 animate-fade-in bg-[var(--color-x-bg)]" style={{ height: 'calc(100vh - 52px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 flex-shrink-0 bg-[var(--color-x-surface)] border-r border-[var(--color-x-border)] flex flex-col z-10" style={{ minHeight: '100%' }}>
        <div className="px-5 py-4 border-b border-[var(--color-x-border)]">
          <p className="text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-[0.08em]">Departments</p>
        </div>
        <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          <button
            onClick={() => setSelectedDept('All')}
            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-all ${selectedDept === 'All' ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] hover:text-[var(--color-x-text)]'}`}
          >
            <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selectedDept === 'All' ? 'text-indigo-600' : 'text-[var(--color-x-text-muted)]'}`} />
            <span className="truncate">All Departments</span>
            <span className="ml-auto text-[11px] font-mono">{activeProjects.length}</span>
          </button>
          {deptList.map(dept => {
            const count = activeProjects.filter(p => p.department === dept).length;
            const isSelected = selectedDept === dept;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-all ${isSelected ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] hover:text-[var(--color-x-text)]'}`}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-[var(--color-x-text-muted)] opacity-50'}`} />
                </div>
                <span className="truncate flex-1">{dept}</span>
                <span className={`ml-auto text-[11px] font-mono ${isSelected ? 'text-indigo-500' : 'text-[var(--color-x-text-muted)]'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-[var(--color-x-border)]">
          <button onClick={() => setTab(tab === 'history' ? 'active' : 'history')}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${tab === 'history' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] border border-transparent'}`}>
            <History className="w-4 h-4" />
            Project Archive {archivedProjects.length > 0 && <span className="ml-auto bg-amber-200/50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{archivedProjects.length}</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-x-bg)]">

        {/* Top Bar */}
        <div className="bg-[var(--color-x-surface)] border-b border-[var(--color-x-border)] px-6 py-3 flex items-center gap-2 flex-shrink-0 z-10 shadow-sm">
          {/* Search */}
          <div className="relative" style={{ width: 200, flexShrink: 0 }}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="x-input pl-8"
              style={{ width: '100%', height: 32, fontSize: 13, padding: '0 12px 0 30px' }}
            />
          </div>
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="x-input"
            style={{ width: 120, height: 32, fontSize: 13, padding: '0 8px', flexShrink: 0 }}
          >
            {STATUS_OPTIONS.map(s => <option key={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="x-input"
            style={{ width: 120, height: 32, fontSize: 13, padding: '0 8px', flexShrink: 0 }}
          >
            {PRIORITY_OPTIONS.map(p => <option key={p}>{p === 'All' ? 'All Priority' : p}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 bg-[var(--color-x-bg)] border border-[var(--color-x-border)] rounded-lg p-0.5">
            <button onClick={() => setView('list')} title="List" className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-[var(--color-x-surface)] shadow-sm text-indigo-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}><Table2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('kanban')} title="Kanban" className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-[var(--color-x-surface)] shadow-sm text-indigo-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('gantt')} title="Gantt" className={`p-1.5 rounded-md transition-all ${view === 'gantt' ? 'bg-[var(--color-x-surface)] shadow-sm text-indigo-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}><BarChartHorizontal className="w-3.5 h-3.5" /></button>
          </div>
          {/* New Project */}
          <button
            onClick={() => openNew(selectedDept !== 'All' ? selectedDept : undefined)}
            className="x-btn x-btn-primary flex-shrink-0"
            style={{ height: 32, fontSize: 13, padding: '0 12px' }}
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="space-y-3">
              <div className="x-card p-5 border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                <p className="text-[13px] font-bold text-amber-800 mb-1 flex items-center gap-2"><Archive className="w-4 h-4" /> Archived Projects</p>
                <p className="text-[12px] text-amber-700/80">Projects here have been archived and removed from active tracking. You can restore or permanently delete them.</p>
              </div>
              {archivedProjects.length === 0 ? (
                <div className="x-card p-16 text-center">
                  <Archive className="w-10 h-10 text-[var(--color-x-border)] mx-auto mb-4" />
                  <p className="text-[14px] font-medium text-[var(--color-x-text-muted)]">No archived projects.</p>
                </div>
              ) : archivedProjects.map(p => (
                <div key={p.id} className="x-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Archive className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[var(--color-x-text-muted)]">{p.id}</span>
                        <span className={`x-badge ${getStatusColor(p.status) === 'bg-emerald-500' ? 'x-badge-green' : getStatusColor(p.status) === 'bg-red-500' ? 'x-badge-red' : getStatusColor(p.status) === 'bg-amber-400' ? 'x-badge-amber' : getStatusColor(p.status) === 'bg-blue-500' ? 'x-badge-blue' : 'x-badge-gray'} text-[9px]`}>{p.status}</span>
                      </div>
                      <p className="text-[14px] font-bold text-[var(--color-x-text)] truncate">{p.name}</p>
                      <p className="text-[12px] text-[var(--color-x-text-secondary)]">{p.department} · {p.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => restoreProject(p.id)} className="x-btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button onClick={() => confirm(`Permanently delete "${p.name}"?`) && purgeProject(p.id)} className="x-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── LIST VIEW: grouped by department ── */}
          {tab === 'active' && view === 'list' && (
            <div className="space-y-6">
              {Object.keys(deptGroups).length === 0 && (
                <div className="x-card p-16 text-center">
                  <FolderOpen className="w-10 h-10 text-[var(--color-x-border)] mx-auto mb-4" />
                  <p className="text-[14px] font-medium text-[var(--color-x-text-muted)]">No projects match your filters.</p>
                </div>
              )}
              {Object.entries(deptGroups).map(([dept, deptProjects]) => {
                const isCollapsed = collapsedDepts.has(dept);
                return (
                  <div key={dept} className="x-card-flush shadow-sm">
                    {/* Department Header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-[var(--color-x-surface)] border-b border-[var(--color-x-border)] cursor-pointer select-none" onClick={() => toggleCollapse(dept)}>
                      <div className="text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] transition-colors">
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      <div className="w-3 h-3 rounded-full flex-shrink-0 bg-indigo-500" />
                      <span className="text-[14px] font-bold text-[var(--color-x-text)]">{dept}</span>
                      <span className="text-[12px] font-medium text-[var(--color-x-text-muted)] bg-[var(--color-x-bg)] px-2 py-0.5 rounded-full border border-[var(--color-x-border)]">{deptProjects.length} projects</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openNew(dept); }}
                        className="ml-auto flex items-center gap-1.5 text-[12px] text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-md font-semibold transition-colors border border-transparent hover:border-indigo-100"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Project
                      </button>
                    </div>

                    {/* Project Rows */}
                    {!isCollapsed && (
                      <div className="bg-[var(--color-x-surface)] overflow-x-auto">
                        <table className="x-table w-full table-fixed min-w-[880px]">
                          <thead>
                            <tr>
                              <th className="w-20 pl-5">ID</th>
                              <th>Project Name</th>
                              <th className="w-36">Owner</th>
                              <th className="w-28">Status</th>
                              <th className="w-24">Priority</th>
                              <th className="w-36">Progress</th>
                              <th className="w-24 text-right pr-5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptProjects.map(p => (
                              <tr key={p.id} onClick={() => goToDetail(p.id)} className="cursor-pointer group">
                                <td className="pl-5 font-mono text-[11px] text-[var(--color-x-text-muted)]">{p.id}</td>
                                <td>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(p.status)}`} />
                                    <span className="font-semibold text-[13px] text-[var(--color-x-text)] group-hover:text-indigo-600 transition-colors truncate" title={p.name}>{p.name}</span>
                                  </div>
                                </td>
                                <td className="truncate" title={p.owner}>{p.owner}</td>
                                <td>
                                  <span className={`x-badge ${getStatusColor(p.status) === 'bg-emerald-500' ? 'x-badge-green' : getStatusColor(p.status) === 'bg-red-500' ? 'x-badge-red' : getStatusColor(p.status) === 'bg-amber-400' ? 'x-badge-amber' : getStatusColor(p.status) === 'bg-blue-500' ? 'x-badge-blue' : 'x-badge-gray'}`}>{p.status}</span>
                                </td>
                                <td>
                                  <span className={`x-priority-${p.priority.toLowerCase()}`}>{p.priority}</span>
                                </td>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-[var(--color-x-bg)] rounded-full overflow-hidden border border-[var(--color-x-border)]">
                                      <div className={`h-full rounded-full ${p.progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${p.progress}%` }} />
                                    </div>
                                    <span className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] w-8 text-right">{p.progress}%</span>
                                  </div>
                                </td>
                                <td className="pr-5 text-right">
                                  <div className={`flex items-center justify-end gap-1 transition-opacity ${openMenuId === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <button onClick={e => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded-md hover:bg-[var(--color-x-bg)] text-[var(--color-x-text-muted)] hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <div className="relative" onClick={e => e.stopPropagation()}>
                                      <button onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)} className="p-1.5 rounded-md hover:bg-[var(--color-x-bg)] text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                      {openMenuId === p.id && (
                                        <div className="absolute right-0 top-8 z-50 bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-xl shadow-xl py-1 w-40 animate-scale-in">
                                          <button onClick={() => { goToDetail(p.id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[12px] font-medium text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)]">View Details</button>
                                          <button onClick={() => { openEdit(p); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[12px] font-medium text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)]">Edit Project</button>
                                          <button onClick={() => { archiveProject(p.id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[12px] font-medium text-amber-600 hover:bg-amber-50">Archive Project</button>
                                          <div className="border-t border-[var(--color-x-border)] my-1" />
                                          <button onClick={() => { if (confirm(`Delete ${p.id}?`)) { purgeProject(p.id); setOpenMenuId(null); } }} className="w-full text-left px-4 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── KANBAN VIEW ── */}
          {tab === 'active' && view === 'kanban' && (() => {
            const groups: Record<string, Project[]> = { 'Not Started': [], 'In Progress': [], 'Delayed': [], 'On Hold': [], 'Completed': [] };
            filtered.forEach(p => groups[p.status]?.push(p));
            return (
              <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-140px)]">
                {Object.entries(groups).map(([status, cols]) => (
                  <div key={status} className="flex-shrink-0 w-[300px] flex flex-col max-h-full">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className={`x-badge ${getStatusColor(status) === 'bg-emerald-500' ? 'x-badge-green' : getStatusColor(status) === 'bg-red-500' ? 'x-badge-red' : getStatusColor(status) === 'bg-amber-400' ? 'x-badge-amber' : getStatusColor(status) === 'bg-blue-500' ? 'x-badge-blue' : 'x-badge-gray'} text-[11px]`}>{status}</span>
                      <span className="text-[11px] font-medium text-[var(--color-x-text-muted)] bg-[var(--color-x-surface)] px-2 py-0.5 rounded-full border border-[var(--color-x-border)]">{cols.length}</span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto px-1 pb-4">
                      {cols.map(p => (
                        <div key={p.id} onClick={() => goToDetail(p.id)} className="x-card p-4 hover:border-indigo-400 cursor-pointer group">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`x-priority-${p.priority.toLowerCase()}`}>{p.priority}</span>
                            <span className="text-[10px] font-mono text-[var(--color-x-text-muted)]">{p.id}</span>
                          </div>
                          <p className="text-[13px] font-bold text-[var(--color-x-text)] leading-snug mb-3 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                              {p.owner.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <p className="text-[11px] text-[var(--color-x-text-secondary)] truncate">{p.owner}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[var(--color-x-bg)] rounded-full overflow-hidden border border-[var(--color-x-border)]">
                              <div className={`h-full rounded-full ${p.progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-x-text-muted)]">{p.progress}%</span>
                          </div>
                        </div>
                      ))}
                      {cols.length === 0 && (
                        <div className="border-2 border-dashed border-[var(--color-x-border)] rounded-xl h-24 flex items-center justify-center">
                          <p className="text-[12px] text-[var(--color-x-text-muted)]">Drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── GANTT VIEW ── */}
          {tab === 'active' && view === 'gantt' && (
            <div className="x-card overflow-x-auto p-5">
              <div className="min-w-[1000px]">
                <div className="flex border-b border-[var(--color-x-border)] pb-3 mb-4">
                  <div className="w-80 flex-shrink-0 text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider">Project</div>
                  <div className="flex-1 flex">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => (
                      <div key={m} className="flex-1 text-center text-[11px] font-bold text-[var(--color-x-text-muted)] border-l border-[var(--color-x-border)]">{m}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                  {filtered.map(p => {
                    const cy = new Date().getFullYear();
                    const sd = p.startDate ? new Date(p.startDate) : new Date();
                    const td = p.targetDate ? new Date(p.targetDate) : new Date(sd.getTime() + 86400000 * 30);
                    let sm = sd.getFullYear() < cy ? 0 : sd.getFullYear() > cy ? 11 : sd.getMonth();
                    let em = td.getFullYear() < cy ? 0 : td.getFullYear() > cy ? 11 : td.getMonth();
                    if (em < sm) em = sm;
                    const sp = (sm / 12) * 100;
                    const wp = (Math.max(1, em - sm + 1) / 12) * 100;
                    const barColor = p.status === 'Completed' ? '#10b981' : p.status === 'Delayed' ? '#ef4444' : '#6366f1';
                    return (
                      <div key={p.id} onClick={() => goToDetail(p.id)} className="flex items-center group cursor-pointer hover:bg-[var(--color-x-bg)] rounded-lg p-2 transition-colors">
                        <div className="w-80 flex-shrink-0 pr-5 truncate">
                          <p className="text-[13px] font-semibold text-[var(--color-x-text)] truncate group-hover:text-indigo-600 transition-colors">{p.name}</p>
                          <p className="text-[11px] text-[var(--color-x-text-muted)]">{p.owner} · {p.department}</p>
                        </div>
                        <div className="flex-1 relative h-7 bg-[var(--color-x-bg)] rounded-md overflow-hidden border border-[var(--color-x-border)]">
                          <div className="absolute inset-0 flex">{Array.from({length:12}).map((_,i) => <div key={i} className="flex-1 border-l border-white/40"/>)}</div>
                          <div className="absolute top-1 bottom-1 rounded-md overflow-hidden shadow-sm transition-all group-hover:shadow-md"
                            style={{ left: `${sp}%`, width: `${Math.min(100-sp, wp)}%`, background: barColor }}>
                            <div className="absolute top-0 bottom-0 left-0 bg-white/20" style={{ width: `${p.progress}%` }} />
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white z-10">{p.progress}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && <div className="text-center p-12 text-[var(--color-x-text-muted)]">No projects to show.</div>}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Click-away for dropdown */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      <ProjectModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditProject(null); setNewProjectDept(null); }}
        editProject={editProject}
        defaultDepartment={newProjectDept || undefined}
      />
    </div>
  );
}
