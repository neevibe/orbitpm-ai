'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, ChevronRight, X, Save, CheckCircle2, AlertTriangle, Clock, Zap, Plus, ArrowLeft } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { getStatusColor, getPriorityColor } from '@/lib/utils';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'] as const;
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'] as const;

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
  const { projects, departments, updateProject, addProject } = useData();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Record<string, any>>({});
  const [deptSearch, setDeptSearch] = useState('');

  const chartData = departments
    .filter(d => d.total > 0)
    .map(d => ({ name: d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name, fullName: d.name, 'In Progress': d.inProgress, 'Completed': d.completed, 'Not Started': d.notStarted, 'Delayed': d.delayed, color: d.color }));

  const selectedDeptData = useMemo(() => {
    if (!selectedDept) return null;
    return departments.find(d => d.name === selectedDept);
  }, [selectedDept, departments]);

  const deptProjects = useMemo(() => {
    if (!selectedDept) return [];
    return projects.filter(p => p.department === selectedDept && !p.archived);
  }, [selectedDept, projects]);

  const filteredDeptProjects = useMemo(() => {
    if (!deptSearch) return deptProjects;
    const q = deptSearch.toLowerCase();
    return deptProjects.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q));
  }, [deptProjects, deptSearch]);

  const startEdit = (projectId: string) => {
    const p = projects.find(pr => pr.id === projectId);
    if (p) {
      setPendingEdits(prev => ({ ...prev, [projectId]: { status: p.status, priority: p.priority, progress: p.progress, owner: p.owner } }));
      setEditingProjectId(projectId);
    }
  };

  const saveEdit = (projectId: string) => {
    if (pendingEdits[projectId]) {
      updateProject(projectId, pendingEdits[projectId]);
    }
    setEditingProjectId(null);
    setPendingEdits(prev => { const n = { ...prev }; delete n[projectId]; return n; });
  };

  const cancelEdit = (projectId: string) => {
    setEditingProjectId(null);
    setPendingEdits(prev => { const n = { ...prev }; delete n[projectId]; return n; });
  };

  const updatePending = (projectId: string, field: string, value: any) => {
    setPendingEdits(prev => ({ ...prev, [projectId]: { ...prev[projectId], [field]: value } }));
  };

  const selectCls = "text-[12px] bg-white border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[#334155] outline-none focus:border-indigo-400";

  // ========== DEPARTMENT DRILL-DOWN VIEW ==========
  if (selectedDept && selectedDeptData) {
    const completed = deptProjects.filter(p => p.status === 'Completed').length;
    const inProgress = deptProjects.filter(p => p.status === 'In Progress').length;
    const delayed = deptProjects.filter(p => p.status === 'Delayed').length;
    const critical = deptProjects.filter(p => p.priority === 'Critical').length;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedDept(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[12px] font-medium text-[#475569] hover:border-indigo-200 hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> All Departments
          </button>
          <ChevronRight className="w-4 h-4 text-[#cbd5e1]" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedDeptData.color }} />
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">{selectedDept}</h1>
          </div>
        </div>

        {/* Dept KPI cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Projects', value: selectedDeptData.total, icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'In Progress', value: inProgress, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Delayed', value: delayed, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Critical Priority', value: critical, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map(k => (
            <div key={k.label} className="glass-card p-4">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-2xl font-bold text-[#0f172a]">{k.value}</p>
              <p className="text-[11px] text-[#94a3b8]">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Project list with inline editing */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#0f172a]">Projects in {selectedDept}</h3>
            <div className="flex items-center gap-2">
              <input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Search..." className="text-[12px] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 outline-none focus:border-indigo-400 w-48" />
              <span className="text-[11px] text-[#94a3b8]">{filteredDeptProjects.length} of {deptProjects.length}</span>
            </div>
          </div>

          <div className="divide-y divide-[#f8fafc]">
            {filteredDeptProjects.length === 0 && (
              <div className="py-10 text-center text-[13px] text-[#94a3b8]">No projects found</div>
            )}
            {filteredDeptProjects.map(p => {
              const isEditing = editingProjectId === p.id;
              const edits = pendingEdits[p.id] || {};
              return (
                <div key={p.id} className={`px-4 py-3.5 transition-colors ${isEditing ? 'bg-indigo-50/50' : 'hover:bg-[#f8fafc]'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[#94a3b8]">{p.id}</span>
                        {!isEditing && <span className={`status-badge ${getStatusColor(p.status)}`}>{p.status}</span>}
                        {!isEditing && <span className={`priority-badge ${getPriorityColor(p.priority)}`}>{p.priority}</span>}
                      </div>
                      <p className="text-[13px] font-semibold text-[#1e293b]">{p.name}</p>
                      {!isEditing && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-[#94a3b8]">Owner: <span className="text-[#64748b] font-medium">{p.owner}</span></span>
                          {p.supportTeam && <span className="text-[11px] text-[#94a3b8]">🤝 {p.supportTeam}</span>}
                          {p.projectDependencies && <span className="text-[11px] text-indigo-400">🔗 {p.projectDependencies}</span>}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <div className="w-16 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-[#94a3b8]">{p.progress}%</span>
                          </div>
                        </div>
                      )}

                      {/* Inline edit fields */}
                      {isEditing && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Status</label>
                            <select value={edits.status || p.status} onChange={e => updatePending(p.id, 'status', e.target.value)} className={selectCls + ' w-full'}>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Priority / Criticality</label>
                            <select value={edits.priority || p.priority} onChange={e => updatePending(p.id, 'priority', e.target.value)} className={selectCls + ' w-full'}>
                              {PRIORITY_OPTIONS.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Project Owner</label>
                            <input type="text" value={edits.owner ?? p.owner} onChange={e => updatePending(p.id, 'owner', e.target.value)} className={selectCls + ' w-full'} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Progress %</label>
                            <input type="number" min={0} max={100} value={edits.progress ?? p.progress} onChange={e => updatePending(p.id, 'progress', Number(e.target.value))} className={selectCls + ' w-full'} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {!isEditing ? (
                        <button onClick={() => startEdit(p.id)} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[#64748b] hover:border-indigo-300 hover:text-indigo-600 transition-all font-medium">
                          Edit
                        </button>
                      ) : (
                        <>
                          <button onClick={() => saveEdit(p.id)} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-semibold">
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => cancelEdit(p.id)} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] transition-all">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN DEPARTMENTS VIEW ==========
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Departments</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Click any department to view and edit its projects</p>
        </div>
      </div>

      {/* Department cards — clickable */}
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
                    <Building2 className="w-4.5 h-4.5" style={{ color: dept.color }} />
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

              {/* Stats row */}
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

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#94a3b8]">Portfolio completion</span>
                  <span className="text-[10px] font-semibold text-[#475569]">{dept.pctDone}%</span>
                </div>
                <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${dept.pctDone}%`, background: dept.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="glass-card p-4">
        <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Project Status by Department</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} width={130} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" radius={0} />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={0} />
            <Bar dataKey="Not Started" stackId="a" fill="#e2e8f0" radius={0} />
            <Bar dataKey="Delayed" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
