'use client';

import { useState, useMemo } from 'react';
import { Download, Printer, Filter, User, HelpCircle, Shield, Briefcase, Plus } from 'lucide-react';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';
import { Task } from './KanbanBoard';

interface RaciMatrixProps {
  tasks: Task[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
  projectDepartment?: string;
}

export default function RaciMatrix({ tasks, onUpdateTasks, projectDepartment }: RaciMatrixProps) {
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterRole, setFilterRole] = useState<'All' | 'R' | 'A' | 'C' | 'I'>('All');
  const [newDeliverableText, setNewDeliverableText] = useState('');

  // Group all possible assignees (all BIAL employees, plus the department names)
  const assigneesList = useMemo(() => {
    const list = BIAL_EMPLOYEES.map(e => e.name);
    // Add unique departments
    const depts = Array.from(new Set(BIAL_EMPLOYEES.map(e => e.department)));
    return [...depts.sort(), ...list.sort()];
  }, []);

  // Filter tasks based on selected assignee or role
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterAssignee === 'All') return true;
      if (filterRole === 'All') {
        return (
          t.responsible === filterAssignee ||
          t.accountable === filterAssignee ||
          t.consulted === filterAssignee ||
          t.informed === filterAssignee
        );
      }
      if (filterRole === 'R') return t.responsible === filterAssignee;
      if (filterRole === 'A') return t.accountable === filterAssignee;
      if (filterRole === 'C') return t.consulted === filterAssignee;
      if (filterRole === 'I') return t.informed === filterAssignee;
      return true;
    });
  }, [tasks, filterAssignee, filterRole]);

  // Inline modification handler
  const handleCellChange = (taskId: string, role: 'R' | 'A' | 'C' | 'I', val: string) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      if (role === 'R') return { ...t, responsible: val };
      if (role === 'A') return { ...t, accountable: val };
      if (role === 'C') return { ...t, consulted: val };
      return { ...t, informed: val };
    });
    onUpdateTasks(updated);
  };

  const handleAddDeliverable = () => {
    const text = newDeliverableText.trim();
    if (!text) return;

    const newTask: Task = {
      id: `DLV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      name: text,
      assignee: 'Unassigned',
      status: 'Backlog',
      priority: 'Medium',
      progress: 0,
      dueDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      tags: ['Deliverable'],
      responsible: projectDepartment || 'Operations',
      accountable: 'Unassigned',
      consulted: 'Unassigned',
      informed: 'Unassigned'
    };

    onUpdateTasks([...tasks, newTask]);
    setNewDeliverableText('');
  };

  // CSV Export compatible with Excel
  const handleExportCSV = () => {
    const headers = ['Deliverable / Task ID', 'Deliverable Name', 'Responsible (R)', 'Accountable (A)', 'Consulted (C)', 'Informed (I)'];
    const rows = filteredTasks.map(t => [
      t.id,
      t.name,
      t.responsible || 'Unassigned',
      t.accountable || 'Unassigned',
      t.consulted || 'Unassigned',
      t.informed || 'Unassigned'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RACI_Matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable PDF view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col h-[580px] no-print">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filter Assignee */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-[11.5px] font-semibold text-slate-650 outline-none focus:border-indigo-400"
            >
              <option value="All">All Resource Roles</option>
              {assigneesList.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {/* Filter Specific Role (only active if filtering by resource) */}
          {filterAssignee !== 'All' && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <span className="text-[11px] font-bold text-slate-400 uppercase">as</span>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-[11.5px] font-semibold text-slate-650 outline-none focus:border-indigo-400"
              >
                <option value="All">Any Role (R/A/C/I)</option>
                <option value="R">Responsible (R)</option>
                <option value="A">Accountable (A)</option>
                <option value="C">Consulted (C)</option>
                <option value="I">Informed (I)</option>
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Matrix
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-450 w-72">Deliverable / Task</th>
              <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-450 text-center w-48">Responsible (R)</th>
              <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-450 text-center w-48">Accountable (A)</th>
              <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-450 text-center w-48">Consulted (C)</th>
              <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-450 text-center w-48">Informed (I)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                {/* Deliverable Info */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[12.5px] font-semibold text-slate-800 leading-snug">{t.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">{t.id}</span>
                  </div>
                </td>

                {/* Responsible (R) */}
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-650 border border-purple-250 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                      R
                    </span>
                    <select
                      value={t.responsible || 'Unassigned'}
                      onChange={e => handleCellChange(t.id, 'R', e.target.value)}
                      className="bg-transparent border-none text-[12px] text-slate-700 outline-none w-32 cursor-pointer font-medium"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {assigneesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* Accountable (A) */}
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-650 border border-blue-250 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                      A
                    </span>
                    <select
                      value={t.accountable || 'Unassigned'}
                      onChange={e => handleCellChange(t.id, 'A', e.target.value)}
                      className="bg-transparent border-none text-[12px] text-slate-700 outline-none w-32 cursor-pointer font-medium"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {assigneesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* Consulted (C) */}
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-650 border border-amber-250 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                      C
                    </span>
                    <select
                      value={t.consulted || 'Unassigned'}
                      onChange={e => handleCellChange(t.id, 'C', e.target.value)}
                      className="bg-transparent border-none text-[12px] text-slate-700 outline-none w-32 cursor-pointer font-medium"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {assigneesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* Informed (I) */}
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-650 border border-emerald-250 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                      I
                    </span>
                    <select
                      value={t.informed || 'Unassigned'}
                      onChange={e => handleCellChange(t.id, 'I', e.target.value)}
                      className="bg-transparent border-none text-[12px] text-slate-700 outline-none w-32 cursor-pointer font-medium"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {assigneesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="py-16 text-center">
            <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-[12.5px] font-medium text-slate-500">No deliverables or tasks found</p>
          </div>
        )}
      </div>

      {/* Footer: Inline input to add deliverable */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center gap-2">
        <input
          type="text"
          placeholder="Add new deliverable or task to matrix..."
          value={newDeliverableText}
          onChange={e => setNewDeliverableText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddDeliverable()}
          className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 flex-1"
        />
        <button
          onClick={handleAddDeliverable}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[12px] font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </button>
      </div>
    </div>
  );
}
