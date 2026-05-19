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

  const inputCls = "bg-white border border-[#e4e4e4] rounded px-3 py-1.5 text-[13px] text-[#334155] outline-none focus:border-[#0a46e5] transition-colors";

  return (
    <div className="flex h-full animate-fade-in" style={{ minHeight: 'calc(100vh - 56px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-[#e4e4e4] flex flex-col" style={{ minHeight: '100%' }}>
        <div className="px-4 py-3 border-b border-[#e4e4e4]">
          <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Departments</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => setSelectedDept('All')}
            className={`w-full text-left px-4 py-2 text-[13px] flex items-center gap-2 transition-colors ${selectedDept === 'All' ? 'bg-[#e8f0fe] text-[#0a46e5] font-semibold' : 'text-[#475569] hover:bg-[#f8f9fa]'}`}
          >
            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">All Departments</span>
            <span className="ml-auto text-[11px] font-mono">{activeProjects.length}</span>
          </button>
          {deptList.map(dept => {
            const count = activeProjects.filter(p => p.department === dept).length;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`w-full text-left px-4 py-2 text-[13px] flex items-center gap-2 transition-colors ${selectedDept === dept ? 'bg-[#e8f0fe] text-[#0a46e5] font-semibold' : 'text-[#475569] hover:bg-[#f8f9fa]'}`}
              >
                <span className="w-2 h-2 rounded-full bg-[#0a46e5] flex-shrink-0" style={{ opacity: selectedDept === dept ? 1 : 0.4 }} />
                <span className="truncate flex-1">{dept}</span>
                <span className="ml-auto text-[11px] font-mono text-[#94a3b8]">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-[#e4e4e4]">
          <button onClick={() => setTab(tab === 'history' ? 'active' : 'history')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-[12px] font-medium transition-colors ${tab === 'history' ? 'bg-amber-50 text-amber-600' : 'text-[#64748b] hover:bg-[#f1f5f9]'}`}>
            <History className="w-3.5 h-3.5" />
            Archive {archivedProjects.length > 0 && <span className="ml-auto bg-amber-100 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full">{archivedProjects.length}</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="bg-white border-b border-[#e4e4e4] px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" className={`${inputCls} pl-8 w-52`} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={inputCls}>
            {PRIORITY_OPTIONS.map(p => <option key={p}>{p === 'All' ? 'All Priority' : p}</option>)}
          </select>

          <div className="flex items-center gap-1 ml-auto bg-[#f1f5f9] rounded p-0.5">
            <button onClick={() => setView('list')} title="List" className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-white shadow-sm text-[#0a46e5]' : 'text-[#94a3b8] hover:text-[#475569]'}`}><Table2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('kanban')} title="Kanban" className={`p-1.5 rounded transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-[#0a46e5]' : 'text-[#94a3b8] hover:text-[#475569]'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('gantt')} title="Gantt" className={`p-1.5 rounded transition-colors ${view === 'gantt' ? 'bg-white shadow-sm text-[#0a46e5]' : 'text-[#94a3b8] hover:text-[#475569]'}`}><BarChartHorizontal className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={() => openNew(selectedDept !== 'All' ? selectedDept : undefined)} className="btn-primary text-[12px] flex items-center gap-1.5 px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="space-y-2">
              <div className="glass-card p-4 border-amber-100 bg-amber-50/30">
                <p className="text-[12px] font-semibold text-amber-700 mb-1">Archived Projects</p>
                <p className="text-[11px] text-amber-600">Projects here have been archived and removed from active tracking. You can restore or permanently delete them.</p>
              </div>
              {archivedProjects.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Archive className="w-8 h-8 text-[#cbd5e1] mx-auto mb-3" />
                  <p className="text-[13px] text-[#94a3b8]">No archived projects.</p>
                </div>
              ) : archivedProjects.map(p => (
                <div key={p.id} className="glass-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Archive className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-[#94a3b8]">{p.id}</span>
                        <span className={`status-badge ${getStatusColor(p.status)}`}>{p.status}</span>
                      </div>
                      <p className="text-[13px] font-semibold text-[#334155] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#94a3b8]">{p.department} · {p.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => restoreProject(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-semibold">
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                    <button onClick={() => confirm(`Permanently delete "${p.name}"?`) && purgeProject(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 text-[11px] font-semibold">
                      <Trash2 className="w-3 h-3" /> Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── LIST VIEW: grouped by department ── */}
          {tab === 'active' && view === 'list' && (
            <div className="space-y-3">
              {Object.keys(deptGroups).length === 0 && (
                <div className="glass-card p-12 text-center">
                  <FolderOpen className="w-8 h-8 text-[#cbd5e1] mx-auto mb-3" />
                  <p className="text-[13px] text-[#94a3b8]">No projects match your filters.</p>
                </div>
              )}
              {Object.entries(deptGroups).map(([dept, deptProjects]) => {
                const isCollapsed = collapsedDepts.has(dept);
                const deptColor = departments.find(d => d.name === dept)?.color || '#64748b';
                return (
                  <div key={dept} className="glass-card overflow-hidden">
                    {/* Department Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#f8f9fa] border-b border-[#e4e4e4]">
                      <button onClick={() => toggleCollapse(dept)} className="text-[#64748b] hover:text-[#1e293b] transition-colors">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: deptColor }} />
                      <span className="text-[13px] font-bold text-[#1e293b]">{dept}</span>
                      <span className="text-[11px] text-[#94a3b8] ml-1">{deptProjects.length} project{deptProjects.length !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => openNew(dept)}
                        className="ml-auto flex items-center gap-1 text-[11px] text-[#0a46e5] hover:bg-[#e8f0fe] px-2.5 py-1 rounded font-semibold transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Project
                      </button>
                    </div>

                    {/* Project Rows */}
                    {!isCollapsed && (
                      <div>
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white border-b border-[#f1f5f9] text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                          <div className="col-span-1">ID</div>
                          <div className="col-span-4">Project Name</div>
                          <div className="col-span-2">Owner</div>
                          <div className="col-span-1">Status</div>
                          <div className="col-span-1">Priority</div>
                          <div className="col-span-2">Progress</div>
                          <div className="col-span-1">Actions</div>
                        </div>
                        {deptProjects.map(p => (
                          <div
                            key={p.id}
                            className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#f8f9fa] hover:bg-[#f8f9fa] group transition-colors cursor-pointer items-center"
                            onClick={() => goToDetail(p.id)}
                          >
                            <div className="col-span-1 font-mono text-[10px] text-[#94a3b8]">{p.id}</div>
                            <div className="col-span-4 flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(p.status)}`} />
                              <span className="text-[13px] font-medium text-[#1e293b] truncate group-hover:text-[#0a46e5] transition-colors">{p.name}</span>
                            </div>
                            <div className="col-span-2 text-[12px] text-[#475569] truncate">{p.owner}</div>
                            <div className="col-span-1">
                              <span className={`status-badge text-[10px] py-0.5 px-1.5 ${getStatusColor(p.status)}`}>{p.status}</span>
                            </div>
                            <div className="col-span-1">
                              <span className={`priority-badge text-[9px] ${getPriorityColor(p.priority)}`}>{p.priority}</span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                                <div className="h-full bg-[#0a46e5] rounded-full" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[10px] text-[#64748b] w-7 text-right">{p.progress}%</span>
                            </div>
                            <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => { e.stopPropagation(); openEdit(p); }}
                                className="p-1 rounded text-[#64748b] hover:bg-white hover:text-[#0a46e5] transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <div className="relative" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                                  className="p-1 rounded text-[#64748b] hover:bg-white hover:text-[#334155] transition-colors"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </button>
                                {openMenuId === p.id && (
                                  <div className="absolute right-0 top-6 z-50 bg-white border border-[#e4e4e4] rounded shadow-lg py-1 w-36">
                                    <button onClick={() => { goToDetail(p.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#334155] hover:bg-[#f8f9fa]">View Details</button>
                                    <button onClick={() => { openEdit(p); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#334155] hover:bg-[#f8f9fa]">Edit Project</button>
                                    <button onClick={() => { archiveProject(p.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[12px] text-amber-600 hover:bg-amber-50">Archive</button>
                                    <div className="border-t border-[#f1f5f9] my-1" />
                                    <button onClick={() => { if (confirm(`Delete ${p.id}?`)) { purgeProject(p.id); setOpenMenuId(null); } }} className="w-full text-left px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50">Delete</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
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
              <div className="flex gap-3 overflow-x-auto pb-4">
                {Object.entries(groups).map(([status, cols]) => (
                  <div key={status} className="flex-shrink-0 w-64 glass-card p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`status-badge text-[10px] ${getStatusColor(status)}`}>{status}</span>
                      <span className="text-[10px] text-[#94a3b8] font-mono">{cols.length}</span>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
                      {cols.map(p => (
                        <div key={p.id} onClick={() => goToDetail(p.id)} className="p-2.5 bg-white rounded border border-[#f1f5f9] hover:border-[#0a46e5] hover:shadow-sm cursor-pointer transition-all group">
                          <p className="text-[10px] font-mono text-[#94a3b8] mb-0.5">{p.id}</p>
                          <p className="text-[12px] font-semibold text-[#1e293b] leading-snug line-clamp-2 group-hover:text-[#0a46e5] transition-colors">{p.name}</p>
                          <p className="text-[10px] text-[#94a3b8] mt-1">{p.owner}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`priority-badge ${getPriorityColor(p.priority)} text-[9px] py-0`}>{p.priority}</span>
                            <div className="flex items-center gap-1">
                              <div className="w-10 h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                                <div className="h-full bg-[#0a46e5] rounded-full" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[9px] text-[#94a3b8]">{p.progress}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {cols.length === 0 && <p className="text-center text-[11px] text-[#e2e8f0] py-6">—</p>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── GANTT VIEW ── */}
          {tab === 'active' && view === 'gantt' && (
            <div className="glass-card overflow-x-auto p-4">
              <div className="min-w-[900px]">
                <div className="flex border-b border-[#e4e4e4] pb-2 mb-3">
                  <div className="w-72 flex-shrink-0 text-[10px] font-bold text-[#64748b] uppercase">Project</div>
                  <div className="flex-1 flex">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => (
                      <div key={m} className="flex-1 text-center text-[10px] font-semibold text-[#64748b] border-l border-[#f1f5f9]">{m}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[65vh] overflow-y-auto">
                  {filtered.map(p => {
                    const cy = new Date().getFullYear();
                    const sd = p.startDate ? new Date(p.startDate) : new Date();
                    const td = p.targetDate ? new Date(p.targetDate) : new Date(sd.getTime() + 86400000 * 30);
                    let sm = sd.getFullYear() < cy ? 0 : sd.getFullYear() > cy ? 11 : sd.getMonth();
                    let em = td.getFullYear() < cy ? 0 : td.getFullYear() > cy ? 11 : td.getMonth();
                    if (em < sm) em = sm;
                    const sp = (sm / 12) * 100;
                    const wp = (Math.max(1, em - sm + 1) / 12) * 100;
                    const barColor = p.status === 'Completed' ? '#10b981' : p.status === 'Delayed' ? '#ef4444' : '#0a46e5';
                    return (
                      <div key={p.id} onClick={() => goToDetail(p.id)} className="flex items-center group cursor-pointer hover:bg-[#f8f9fa] rounded px-1 py-1 transition-colors">
                        <div className="w-72 flex-shrink-0 pr-4 truncate">
                          <p className="text-[12px] font-medium text-[#1e293b] truncate group-hover:text-[#0a46e5] transition-colors">{p.name}</p>
                          <p className="text-[10px] text-[#94a3b8]">{p.owner} · {p.department}</p>
                        </div>
                        <div className="flex-1 relative h-6 bg-[#f1f5f9] rounded overflow-hidden">
                          <div className="absolute inset-0 flex">{Array.from({length:12}).map((_,i) => <div key={i} className="flex-1 border-l border-white/40"/>)}</div>
                          <div className="absolute top-1 bottom-1 rounded overflow-hidden border border-black/10"
                            style={{ left: `${sp}%`, width: `${Math.min(100-sp, wp)}%`, background: barColor }}>
                            <div className="absolute top-0 bottom-0 left-0 bg-white/25" style={{ width: `${p.progress}%` }} />
                            <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-bold text-white z-10">{p.progress}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && <p className="text-center text-[12px] text-[#94a3b8] py-10">No projects to show.</p>}
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
