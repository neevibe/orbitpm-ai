'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Plus, X, Save, User, Building2, AlertCircle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';

interface Dependency {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  assignedType: 'department' | 'user';
  assignedTo: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Blocked';
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  notes: string;
}

function getEmployeeDepartment(name: string): string | null {
  const emp = BIAL_EMPLOYEES.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (!emp) return null;
  const dept = emp.department.toLowerCase();
  if (dept.startsWith('digital')) return 'Digital & Data';
  if (dept.startsWith('advertis')) return 'Advertising & Marketing';
  if (dept.startsWith('duty') || dept === 'dutyfree') return 'Duty Free';
  if (dept.startsWith('commercial')) return 'Commercial Development';
  if (dept.startsWith('oper')) return 'Operations';
  if (dept === 'basl') return 'BASL';
  if (dept === 'cbb' || dept === 'ccb' || dept.startsWith('amen')) return 'BASL';
  return emp.department;
}

export default function DependenciesPage() {
  const router = useRouter();
  const { projects, updateProject } = useData();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [assignFilter, setAssignFilter] = useState('All');

  // Compute dependencies dynamically from all valid projects in the store
  const dependencies = useMemo(() => {
    const list: Dependency[] = [];
    projects.forEach(proj => {
      // Exclude virtual mirror rows so each dependency is listed once (from its
      // canonical parent project only).
      if (proj.isDependencyMirror) return;

      if (proj.classifiedDependencies) {
        proj.classifiedDependencies.forEach(dep => {
          list.push({
            id: dep.id,
            projectId: proj.id,
            projectName: proj.name,
            description: dep.description || '',
            assignedType: (dep.owners && dep.owners.length > 0) ? 'user' : 'department',
            assignedTo: (dep.owners && dep.owners.length > 0) ? dep.owners[0] : (dep.department || ''),
            status: (dep.status || 'Pending') as Dependency['status'],
            priority: (dep.priority || 'Medium') as Dependency['priority'],
            dueDate: dep.dueDate || '',
            notes: dep.notes || '',
          });
        });
      }
    });
    return list;
  }, [projects]);

  const pending = dependencies.filter(d => d.status === 'Pending').length;
  const inProgress = dependencies.filter(d => d.status === 'In Progress').length;
  const blocked = dependencies.filter(d => d.status === 'Blocked').length;
  const resolved = dependencies.filter(d => d.status === 'Resolved').length;

  const filtered = dependencies.filter(d => {
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchAssign = assignFilter === 'All' || d.assignedType === assignFilter;
    return matchStatus && matchAssign;
  });

  const [form, setForm] = useState({
    projectId: '', description: '', assignedType: 'user' as 'department' | 'user',
    assignedTo: '', status: 'Pending' as Dependency['status'],
    priority: 'Medium' as Dependency['priority'], dueDate: '', notes: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.description || !form.assignedTo) return;
    const project = projects.find(p => p.id === form.projectId);
    if (!project) return;

    // Resolve target department & owners list
    let targetDept = '';
    let ownersList: string[] = [];
    if (form.assignedType === 'department') {
      targetDept = form.assignedTo;
    } else {
      ownersList = [form.assignedTo];
      targetDept = getEmployeeDepartment(form.assignedTo) || project.department;
    }

    const newDepItem = {
      id: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'internal' as const,
      department: targetDept,
      owners: ownersList,
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
      notes: form.notes,
    };

    const updatedDeps = [...(project.classifiedDependencies || []), newDepItem];
    updateProject(project.id, { classifiedDependencies: updatedDeps });

    setShowModal(false);
    setForm({ projectId: '', description: '', assignedType: 'user', assignedTo: '', status: 'Pending', priority: 'Medium', dueDate: '', notes: '' });
  };

  const updateStatus = (depId: string, newStatus: Dependency['status']) => {
    const project = projects.find(p => p.classifiedDependencies?.some(d => d.id === depId));
    if (project && project.classifiedDependencies) {
      const updatedDeps = project.classifiedDependencies.map(d => 
        d.id === depId ? { ...d, status: newStatus } : d
      );
      updateProject(project.id, { classifiedDependencies: updatedDeps });
    }
  };

  const statusColor = (s: string) => {
    switch(s) {
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'In Progress': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Blocked': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-[#f1f5f9] text-[#64748b]';
    }
  };

  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-[#94a3b8]";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Dependencies</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Track cross-project dependencies assigned to departments and team members</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-[12px]"><Plus className="w-3.5 h-3.5" /> Add Dependency</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'In Progress', value: inProgress, icon: ArrowRight, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Blocked', value: blocked, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'Resolved', value: resolved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(k => (
          <div key={k.label} className={`glass-card p-4 ${k.bg} border ${k.border}`}>
            <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
            <p className="text-2xl font-bold text-[#0f172a]">{k.value}</p>
            <p className="text-[11px] text-[#64748b] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-blue-500">
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select value={assignFilter} onChange={e => setAssignFilter(e.target.value)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-blue-500">
          <option value="All">All Assignees</option>
          <option value="user">Individual Users</option>
          <option value="department">Departments</option>
        </select>
      </div>

      {/* Dependency List */}
      <div className="space-y-2.5">
        {filtered.map(dep => (
          <div key={dep.id} className="glass-card p-4 hover:border-blue-200 transition-all">
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                dep.assignedType === 'department' ? 'bg-purple-50' : 'bg-blue-50'
              }`}>
                {dep.assignedType === 'department'
                  ? <Building2 className="w-4 h-4 text-purple-500" />
                  : <User className="w-4 h-4 text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-[#94a3b8]">{dep.id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor(dep.status)}`}>{dep.status}</span>
                  <span className={`priority-badge ${
                    dep.priority === 'High' ? 'high' : dep.priority === 'Medium' ? 'medium' : 'low'
                  } text-[8px] py-0`}>{dep.priority}</span>
                </div>
                <p className="text-[13px] font-semibold text-[#1e293b] mb-0.5">{dep.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-[#64748b]">
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${dep.projectId}`)}
                    className="flex items-center gap-1 hover:underline cursor-pointer group/link"
                    title={`Open ${dep.projectName}`}
                  >
                    <Link2 className="w-3 h-3" />
                    <span className="font-mono text-blue-500 group-hover/link:text-blue-700">{dep.projectId}</span>
                    <span className="text-[#475569] group-hover/link:text-[#1e293b]"> — {dep.projectName}</span>
                  </button>
                  <span>→</span>
                  <span className="font-medium text-[#475569]">{dep.assignedTo}</span>
                  {dep.dueDate && <span className="text-[#94a3b8]">Due: {dep.dueDate}</span>}
                </div>
                {dep.notes && <p className="text-[11px] text-[#94a3b8] mt-1 italic">{dep.notes}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {dep.status !== 'Resolved' && (
                  <select
                    value={dep.status}
                    onChange={e => updateStatus(dep.id, e.target.value as Dependency['status'])}
                    className="text-[11px] bg-white border border-[#e2e8f0] rounded px-2 py-1 text-[#334155] outline-none focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Dependency Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-white border border-[#e2e8f0] rounded-xl shadow-2xl animate-scale-in">
            <div className="border-b border-[#f1f5f9] px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#0f172a]">Add Dependency</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Linked Project *</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required className={inputCls}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Dependency Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} required placeholder="What is needed?" className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Assign To</label>
                  <select value={form.assignedType} onChange={e => setForm(f => ({ ...f, assignedType: e.target.value as any }))} className={inputCls}>
                    <option value="user">Individual User</option>
                    <option value="department">Department</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">{form.assignedType === 'department' ? 'Department' : 'User Name'} *</label>
                  <input type="text" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} required placeholder={form.assignedType === 'department' ? 'e.g., Operations' : 'e.g., Musthaq Ahamed'} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))} className={inputCls}>
                    <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>
                    <option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Blocked">Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-[12px]">Cancel</button>
                <button type="submit" className="btn-primary text-[12px]"><Save className="w-3.5 h-3.5" /> Add Dependency</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
