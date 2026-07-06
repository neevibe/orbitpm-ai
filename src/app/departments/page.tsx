'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, ChevronRight, X, Save, AlertTriangle, Zap, ArrowLeft, Edit3, Plus } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import ProjectModal from '@/components/modals/ProjectModal';
import { getStatusColor, getPriorityColor } from '@/lib/utils';
import type { Project } from '@/lib/mock-data';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'] as const;
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'] as const;

type EditForm = {
  name: string; department: string; owner: string;
  status: Project['status']; priority: Project['priority'];
  progress: number; startDate: string; targetDate: string;
  risks: string; objective: string; projectDependencies: string;
  kpi: string; supportTeam: string; notes: string;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[#1e293b] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.fill }}>● {p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DepartmentsPage() {
  const { projects, departments, updateProject } = useData();
  const { canModifyDepartment, isAdmin, user, isDemoMode } = useAuth();
  const currentUserName = isDemoMode
    ? 'Demo User'
    : (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || '';
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
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
    name: d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name,
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

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name, department: p.department, owner: p.owner || '',
      status: p.status, priority: p.priority, progress: p.progress,
      startDate: p.startDate || '', targetDate: p.targetDate || '',
      risks: p.risks || '', objective: p.objective || '',
      projectDependencies: p.projectDependencies || '',
      kpi: p.kpi || '', supportTeam: p.supportTeam || '', notes: p.notes || '',
    });
  };

  const saveEdit = (id: string) => {
    if (editForm) {
      updateProject(id, {
        ...editForm,
        startDate: editForm.startDate || null,
        targetDate: editForm.targetDate || null,
      });
    }
    setEditingId(null);
    setEditForm(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const set = (field: keyof EditForm, value: any) => {
    setEditForm(f => f ? { ...f, [field]: value } : f);
  };

  // styles
  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 placeholder:text-[#94a3b8]";
  const labelCls = "block text-[10px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider";

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
          <button onClick={() => { setSelectedDept(null); setEditingId(null); setEditForm(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[12px] font-medium text-[#475569] hover:border-indigo-200 hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> All Departments
          </button>
          <ChevronRight className="w-4 h-4 text-[#cbd5e1]" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedDeptData.color }} />
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">{selectedDept}</h1>
          </div>
          <span className="ml-2 text-[12px] text-[#94a3b8]">{filteredProjects.length} of {deptProjects.length} shown</span>
          {canModifyDepartment(selectedDept) && (
            <button onClick={() => openNew(selectedDept)} className="ml-auto btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
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
            <div key={k.label} className="glass-card p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Search by name, ID, owner..."
            className="text-[13px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 outline-none focus:border-indigo-400 w-64" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-[13px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[#334155] outline-none focus:border-indigo-400">
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'id' | 'owner')}
            className="text-[13px] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[#334155] outline-none focus:border-indigo-400">
            <option value="id">Sort: ID</option>
            <option value="owner">Sort: Owner</option>
          </select>
        </div>

        {/* Project list */}
        <div className="space-y-2">
          {filteredProjects.length === 0 && (
            <div className="glass-card p-10 text-center text-[13px] text-[#94a3b8]">No projects match your filters</div>
          )}

          {filteredProjects.map(p => {
            const isEditing = editingId === p.id;

            return (
              <div key={p.id} className={`glass-card transition-all ${isEditing ? 'border-indigo-200 shadow-md' : 'hover:border-[#cbd5e1]'}`}>
                {/* ── Collapsed row (view mode) ── */}
                {!isEditing && (
                  <div className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[#94a3b8]">{p.id}</span>
                        <span className={`status-badge ${getStatusColor(p.status)}`}>{p.status}</span>
                        <span className={`priority-badge ${getPriorityColor(p.priority)}`}>{p.priority}</span>
                        {p.progress > 0 && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <div className="w-14 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-[#94a3b8]">{p.progress}%</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[14px] font-bold text-[#0f172a]">{p.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-[#64748b]">👤 <span className="font-medium">{p.owner || '—'}</span></span>
                        {p.startDate && <span className="text-[11px] text-[#94a3b8]">📅 {p.startDate} → {p.targetDate || '?'}</span>}
                        {p.supportTeam && <span className="text-[11px] text-[#94a3b8]">🤝 {p.supportTeam}</span>}
                        {p.projectDependencies && <span className="text-[11px] text-indigo-400">🔗 {p.projectDependencies}</span>}
                        {p.kpi && <span className="text-[11px] text-emerald-600">📊 {p.kpi.length > 50 ? p.kpi.slice(0, 50) + '…' : p.kpi}</span>}
                      </div>
                      {p.objective && <p className="text-[11px] text-[#94a3b8] mt-1 italic line-clamp-1">{p.objective}</p>}
                    </div>
                    {canModifyDepartment(p.department) && (isAdmin || p.owner === currentUserName) && (
                      <button onClick={() => startEdit(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[12px] font-semibold text-[#475569] hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0">
                        <Edit3 className="w-3.5 h-3.5" /> Edit All Fields
                      </button>
                    )}
                  </div>
                )}

                {/* ── Expanded edit form (edit mode) ── */}
                {isEditing && editForm && (
                  <div className="p-5">
                    {/* Edit header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f1f5f9]">
                      <div>
                        <p className="text-[12px] font-bold text-indigo-600">Editing: <span className="font-mono">{p.id}</span></p>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">All changes save to the project register when you click Save</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[12px] text-[#64748b] hover:bg-[#f1f5f9] transition-all">
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button onClick={() => saveEdit(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                          <Save className="w-3.5 h-3.5" /> Save All Changes
                        </button>
                      </div>
                    </div>

                    {/* ── Row 1: Name + Department ── */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2">
                        <label className={labelCls}>Project Name</label>
                        <input type="text" value={editForm.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Project name" />
                      </div>
                      <div>
                        <label className={labelCls}>Department</label>
                        <select value={editForm.department} onChange={e => set('department', e.target.value)} className={inputCls}>
                          {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* ── Row 2: Owner + Status + Priority ── */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className={labelCls}>Project Owner</label>
                        <input type="text" value={editForm.owner} onChange={e => set('owner', e.target.value)} className={inputCls} placeholder="Owner name" />
                      </div>
                      <div>
                        <label className={labelCls}>Current Status</label>
                        <select value={editForm.status} onChange={e => set('status', e.target.value as Project['status'])} className={inputCls}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Priority / Criticality</label>
                        <select value={editForm.priority} onChange={e => set('priority', e.target.value as Project['priority'])} className={inputCls}>
                          {PRIORITY_OPTIONS.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* ── Row 3: Progress + Start Date + End Date ── */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className={labelCls}>Progress %</label>
                        <input type="number" min={0} max={100} value={editForm.progress} onChange={e => set('progress', Number(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Start Date</label>
                        <input type="date" value={editForm.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>End / Target Date</label>
                        <input type="date" value={editForm.targetDate} onChange={e => set('targetDate', e.target.value)} className={inputCls} />
                      </div>
                    </div>

                    {/* ── Row 4: Dependencies + Supporting Team ── */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={labelCls}>Dependencies</label>
                        <input type="text" value={editForm.projectDependencies} onChange={e => set('projectDependencies', e.target.value)} className={inputCls} placeholder="e.g. PRDIGI_03, PROPR_01" />
                      </div>
                      <div>
                        <label className={labelCls}>Supporting Team</label>
                        <input type="text" value={editForm.supportTeam} onChange={e => set('supportTeam', e.target.value)} className={inputCls} placeholder="e.g. IT Team, Vendor XYZ" />
                      </div>
                    </div>

                    {/* ── Row 5: Business Objective ── */}
                    <div className="mb-3">
                      <label className={labelCls}>Business Objective</label>
                      <textarea value={editForm.objective} onChange={e => set('objective', e.target.value)} rows={2} placeholder="What outcome does this project achieve?" className={`${inputCls} resize-none`} />
                    </div>

                    {/* ── Row 6: KPI ── */}
                    <div className="mb-3">
                      <label className={labelCls}>KPI (Key Performance Indicators)</label>
                      <textarea value={editForm.kpi} onChange={e => set('kpi', e.target.value)} rows={2} placeholder="e.g. 90% uptime, 15% revenue increase, NPS > 8, ₹10Cr savings" className={`${inputCls} resize-none`} />
                    </div>

                    {/* ── Row 7: Key Risks / Blockers ── */}
                    <div className="mb-3">
                      <label className={labelCls}>Key Risks / Blockers</label>
                      <textarea value={editForm.risks} onChange={e => set('risks', e.target.value)} rows={2} placeholder="Known risks, blockers..." className={`${inputCls} resize-none`} />
                    </div>

                    {/* ── Row 8: Notes ── */}
                    <div className="mb-4">
                      <label className={labelCls}>Notes</label>
                      <textarea value={editForm.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional notes..." className={`${inputCls} resize-none`} />
                    </div>

                    {/* Save footer */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f1f5f9]">
                      <button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[12px] text-[#64748b] hover:bg-[#f1f5f9] transition-all">
                        Cancel
                      </button>
                      <button onClick={() => saveEdit(p.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-md">
                        <Save className="w-3.5 h-3.5" /> Save All Changes to {p.id}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <ProjectModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setNewProjectDept(null); }}
          defaultDepartment={newProjectDept || undefined}
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
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Departments</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Click any department to view and edit all project fields</p>
        </div>
        <button onClick={() => openNew()} className="btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
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
              className="glass-card p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: dept.color + '20' }}>
                    <Building2 className="w-4 h-4" style={{ color: dept.color }} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-[#0f172a]">{dept.name}</h3>
                    <p className="text-[11px] text-[#94a3b8]">{dept.total} projects</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#94a3b8] group-hover:text-indigo-500 transition-colors">
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
                    <p className="text-[9px] text-[#94a3b8] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-[#94a3b8]">Portfolio completion</span>
                  <span className="text-[10px] font-semibold text-[#475569]">{dept.pctDone}%</span>
                </div>
                <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${dept.pctDone}%`, background: dept.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-4">
        <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Project Status by Department</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} width={130} />
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
