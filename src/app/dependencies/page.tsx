'use client';

import { useState } from 'react';
import { Link2, Plus, X, Save, User, Building2, AlertCircle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useData } from '@/lib/data-context';

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
  createdDate: string;
  notes: string;
}

// Initial sample dependencies from BIAL data
const initialDependencies: Dependency[] = [
  { id: 'DEP-001', projectId: 'PRDIGI_03', projectName: 'Payment Gateway Enhancement', description: 'DutyFree POS integration API ready', assignedType: 'department', assignedTo: 'Duty Free', status: 'Pending', priority: 'High', dueDate: '2026-06-15', createdDate: '2026-05-01', notes: 'Pilot with new device scheduled for 15th May' },
  { id: 'DEP-002', projectId: 'PRDIGI_06', projectName: 'CRM for Pulse Rewards Members', description: 'CRM platform vendor selection completed', assignedType: 'user', assignedTo: 'Musthaq Ahamed', status: 'In Progress', priority: 'High', dueDate: '2026-05-30', createdDate: '2026-04-15', notes: 'Proposal ready for leadership review' },
  { id: 'DEP-003', projectId: 'PRDIGI_08', projectName: 'Duty Free Click and Collect', description: 'App stability testing in low-network zones', assignedType: 'user', assignedTo: 'Ajay Rao', status: 'Pending', priority: 'High', dueDate: '2026-06-01', createdDate: '2026-04-20', notes: '' },
  { id: 'DEP-004', projectId: 'PROPR_01', projectName: 'BIAL Academy relaunch', description: 'RFQ vendor response evaluation', assignedType: 'department', assignedTo: 'Operations', status: 'In Progress', priority: 'Medium', dueDate: '2026-05-20', createdDate: '2026-05-01', notes: 'Go-live target May 11' },
  { id: 'DEP-005', projectId: 'PROPR_03', projectName: 'ISO final certification process', description: 'Internal audit completion sign-off', assignedType: 'user', assignedTo: 'Rohan', status: 'Pending', priority: 'High', dueDate: '2026-07-31', createdDate: '2026-05-01', notes: '' },
  { id: 'DEP-006', projectId: 'PRDIGI_14', projectName: 'AI Chatbot for Airport Navigation', description: 'LLM guardrail and fallback routing implementation', assignedType: 'user', assignedTo: 'Musthaq Ahamed', status: 'In Progress', priority: 'High', dueDate: '2026-07-15', createdDate: '2026-04-15', notes: 'Hallucination risk mitigation needed' },
  { id: 'DEP-007', projectId: 'PRCOMDEV_15', projectName: 'New Brand Partnership Framework', description: 'Legal team template contracts approval', assignedType: 'department', assignedTo: 'Commercial Development', status: 'Pending', priority: 'Medium', dueDate: '2026-06-30', createdDate: '2026-05-01', notes: '' },
  { id: 'DEP-008', projectId: 'PRDIGI_01', projectName: 'DBS Bank Integration', description: 'DBS API sandbox access credentials', assignedType: 'department', assignedTo: 'Digital & Data', status: 'Blocked', priority: 'High', dueDate: '2026-05-31', createdDate: '2026-04-01', notes: 'Waiting on DBS technical team response' },
];

export default function DependenciesPage() {
  const { projects } = useData();
  const [dependencies, setDependencies] = useState<Dependency[]>(initialDependencies);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [assignFilter, setAssignFilter] = useState('All');

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
    setDependencies(prev => [{
      ...form,
      id: `DEP-${String(prev.length + 1).padStart(3, '0')}`,
      projectName: project?.name || '',
      createdDate: new Date().toISOString().split('T')[0],
    }, ...prev]);
    setShowModal(false);
    setForm({ projectId: '', description: '', assignedType: 'user', assignedTo: '', status: 'Pending', priority: 'Medium', dueDate: '', notes: '' });
  };

  const updateStatus = (id: string, newStatus: Dependency['status']) => {
    setDependencies(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
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

  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 placeholder:text-[#94a3b8]";

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
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select value={assignFilter} onChange={e => setAssignFilter(e.target.value)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
          <option value="All">All Assignees</option>
          <option value="user">Individual Users</option>
          <option value="department">Departments</option>
        </select>
      </div>

      {/* Dependency List */}
      <div className="space-y-2.5">
        {filtered.map(dep => (
          <div key={dep.id} className="glass-card p-4 hover:border-indigo-200 transition-all">
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                dep.assignedType === 'department' ? 'bg-purple-50' : 'bg-indigo-50'
              }`}>
                {dep.assignedType === 'department'
                  ? <Building2 className="w-4 h-4 text-purple-500" />
                  : <User className="w-4 h-4 text-indigo-500" />}
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
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    <span className="font-mono text-indigo-500">{dep.projectId}</span> — {dep.projectName}
                  </span>
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
                    className="text-[11px] bg-white border border-[#e2e8f0] rounded px-2 py-1 text-[#334155] outline-none focus:border-indigo-500"
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
