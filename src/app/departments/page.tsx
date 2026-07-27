'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, ChevronRight, ArrowLeft, Edit3, Plus } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import ProjectModal from '@/components/modals/ProjectModal';
import type { Project } from '@/lib/mock-data';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[var(--color-x-text)] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.fill }}>● {p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DepartmentsPage() {
  const { projects, departments } = useData();
  const { canModifyDepartment } = useAuth();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [editModalProject, setEditModalProject] = useState<Project | null>(null);
  const [deptSearch, setDeptSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newProjectDept, setNewProjectDept] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'id' | 'owner'>('id');

  const openNew = (dept?: string) => {
    setNewProjectDept(dept || null);
    setShowModal(true);
  };

  const chartData = departments.filter(d => d.total > 0).map(d => ({
    name: d.name,
    'In Progress': d.inProgress, 'Completed': d.completed,
    'Not Started': d.notStarted, 'Delayed': d.delayed, color: d.color,
  }));

  const selectedDeptData = useMemo(() => departments.find(d => d.name === selectedDept), [selectedDept, departments]);

  const deptProjects = useMemo(() => {
    if (!selectedDept) return [];
    return projects.filter(p => p.department === selectedDept && !p.archived);
  }, [selectedDept, projects]);

  const filteredProjects = useMemo(() => {
    let pool = deptProjects;
    if (statusFilter !== 'All') pool = pool.filter(p => p.status === statusFilter);
    if (deptSearch) {
      const q = deptSearch.toLowerCase();
      pool = pool.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q));
    }
    return pool.slice().sort((a, b) => {
      if (sortBy === 'owner') return (a.owner || '').localeCompare(b.owner || '');
      return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [deptProjects, statusFilter, deptSearch, sortBy]);

  // ══════════════════════════════════════════════
  // DEPARTMENT DRILL-DOWN VIEW
  // ══════════════════════════════════════════════
  if (selectedDept && selectedDeptData) {
    const inProgress = deptProjects.filter(p => p.status === 'In Progress').length;
    const delayed = deptProjects.filter(p => p.status === 'Delayed').length;
    const critical = deptProjects.filter(p => p.priority === 'Critical').length;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedDept(null); setEditModalProject(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-x-surface)] border border-[var(--color-x-border)] text-[12px] font-medium text-[var(--color-x-text-secondary)] hover:border-indigo-200 hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> All Departments
          </button>
          <ChevronRight className="w-4 h-4 text-[var(--color-x-text-muted)]" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedDeptData.color }} />
            <h1 className="text-xl font-bold text-[var(--color-x-text)] tracking-tight">{selectedDept}</h1>
          </div>
          <span className="ml-2 text-[12px] text-[var(--color-x-text-muted)]">{filteredProjects.length} of {deptProjects.length} shown</span>
          {canModifyDepartment(selectedDept) && (
            <button onClick={() => openNew(selectedDept)} className="ml-auto x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Project
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Projects', value: selectedDeptData.total, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'In Progress', value: inProgress, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Delayed', value: delayed, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Critical Priority', value: critical, color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map(k => (
            <div key={k.label} className="x-card p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Search by name, ID, owner..."
            className="x-input w-64" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="x-input">
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'id' | 'owner')}
            className="x-input">
            <option value="id">Sort: ID</option>
            <option value="owner">Sort: Owner</option>
          </select>
        </div>

        {/* Project list */}
        <div className="space-y-2">
          {filteredProjects.length === 0 && (
            <div className="x-card p-10 text-center text-[13px] text-[var(--color-x-text-muted)]">No projects match your filters</div>
          )}

          {filteredProjects.map(p => {
            return (
              <div key={p.id} className="x-card transition-all hover:border-indigo-200">
                <div className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[var(--color-x-text-muted)]">{p.id}</span>
                        <span className={`x-badge text-[11px] ${
                          p.status === 'Completed' ? 'x-badge-green' :
                          p.status === 'In Progress' ? 'x-badge-blue' :
                          p.status === 'Delayed' ? 'x-badge-red' :
                          p.status === 'On Hold' ? 'x-badge-amber' : 'x-badge-gray'
                        }`}>{p.status}</span>
                        <span className={`x-priority-${p.priority.toLowerCase()}`}>{p.priority}</span>
                        {p.progress > 0 && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <div className="w-14 h-1.5 bg-[var(--color-x-bg)] rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-[var(--color-x-text-muted)]">{p.progress}%</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[14px] font-bold text-[var(--color-x-text)]">{p.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-[var(--color-x-text-secondary)]">👤 <span className="font-medium">{p.owner || '—'}</span></span>
                        {p.startDate && <span className="text-[11px] text-[var(--color-x-text-muted)]">📅 {p.startDate} → {p.targetDate || '?'}</span>}
                        {p.supportTeam && <span className="text-[11px] text-[var(--color-x-text-muted)]">🤝 {p.supportTeam}</span>}
                        {p.projectDependencies && <span className="text-[11px] text-indigo-400">🔗 {p.projectDependencies}</span>}
                        {p.kpi && <span className="text-[11px] text-emerald-600">📊 {p.kpi.length > 50 ? p.kpi.slice(0, 50) + '…' : p.kpi}</span>}
                      </div>
                      {p.objective && <p className="text-[11px] text-[var(--color-x-text-muted)] mt-1 italic line-clamp-1">{p.objective}</p>}
                    </div>
                    {canModifyDepartment(p.department) && (
                      <button onClick={() => setEditModalProject(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-x-surface)] border border-[var(--color-x-border)] text-[12px] font-semibold text-[var(--color-x-text-secondary)] hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0">
                        <Edit3 className="w-3.5 h-3.5" /> Edit All Fields
                      </button>
                    )}
                  </div>
              </div>
            );
          })}
        </div>
        <ProjectModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setNewProjectDept(null); }}
          defaultDepartment={newProjectDept || undefined}
        />
        {/* Editing uses the SAME shared form as Create and the Projects page */}
        <ProjectModal
          isOpen={!!editModalProject}
          onClose={() => setEditModalProject(null)}
          editProject={editModalProject}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // MAIN DEPARTMENTS OVERVIEW
  // ══════════════════════════════════════════════
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-x-text)] tracking-tight">Departments</h1>
          <p className="text-[13px] text-[var(--color-x-text-secondary)] mt-0.5">Click any department to view and edit all project fields</p>
        </div>
        <button onClick={() => openNew()} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Project
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {departments.filter(d => d.total > 0).map(dept => {
          const deptProjs = projects.filter(p => p.department === dept.name && !p.archived);
          const inProgress = deptProjs.filter(p => p.status === 'In Progress').length;
          const delayed = deptProjs.filter(p => p.status === 'Delayed').length;
          const critical = deptProjs.filter(p => p.priority === 'Critical').length;
          return (
            <div key={dept.name} onClick={() => setSelectedDept(dept.name)}
              className="x-card p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dept.color + '20' }}>
                    <Building2 className="w-4 h-4" style={{ color: dept.color }} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">{dept.name}</h3>
                    <p className="text-[11px] text-[var(--color-x-text-muted)]">{dept.total} projects</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--color-x-text-muted)] group-hover:text-indigo-500 transition-colors">
                  <span className="text-[11px] font-medium">Edit Projects</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'In Progress', val: inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Delayed', val: delayed, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Critical', val: critical, color: 'text-orange-500', bg: 'bg-orange-50' },
                  { label: '% Done', val: `${dept.pctDone}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-2 ${s.bg} text-center`}>
                    <p className={`text-[15px] font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[9px] text-[var(--color-x-text-muted)] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-[var(--color-x-text-muted)]">Portfolio completion</span>
                  <span className="text-[10px] font-semibold text-[var(--color-x-text-secondary)]">{dept.pctDone}%</span>
                </div>
                <div className="h-2 bg-[var(--color-x-bg)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${dept.pctDone}%`, background: dept.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="x-card p-4">
        <h3 className="text-[12px] font-semibold text-[var(--color-x-text-secondary)] mb-3">Project Status by Department</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} width={150} interval={0} />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" />
            <Bar dataKey="Not Started" stackId="a" fill="#e2e8f0" />
            <Bar dataKey="Delayed" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ProjectModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNewProjectDept(null); }}
        defaultDepartment={newProjectDept || undefined}
      />
    </div>
  );
}
