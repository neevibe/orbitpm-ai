'use client';

import { useState } from 'react';
import { Plus, Clock, Tag, User, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { PRIORITY_META } from '@/context/AppContext';

// Task Status columns
export type KanbanStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Completed';

export interface Task {
  id: string;
  name: string;
  assignee: string;
  /** Email of the assignee — required for external assignees (used for notifications). */
  assigneeEmail?: string;
  /** True when the task is assigned to someone outside the organization. */
  external?: boolean;
  status: KanbanStatus;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  tags?: string[];
  isMilestone?: boolean;
  parentId?: string | null;
  responsible?: string;
  accountable?: string;
  consulted?: string;
  informed?: string;
  dependencies?: string[];
}

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
  projectOwner?: string;
}

const COLUMNS: { key: KanbanStatus; label: string; bg: string; border: string; text: string }[] = [
  { key: 'Backlog', label: 'Backlog', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
  { key: 'To Do', label: 'To Do', bg: 'bg-indigo-50/40', border: 'border-indigo-150', text: 'text-indigo-700' },
  { key: 'In Progress', label: 'In Progress', bg: 'bg-blue-50/40', border: 'border-blue-150', text: 'text-blue-700' },
  { key: 'Review', label: 'Review', bg: 'bg-amber-50/40', border: 'border-amber-150', text: 'text-amber-700' },
  { key: 'Completed', label: 'Completed', bg: 'bg-emerald-50/40', border: 'border-emerald-150', text: 'text-emerald-700' },
];

function getInitials(name: string) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function generateRandomTaskId() {
  return `TSK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function getDefaultDueDate() {
  return new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
}

export default function KanbanBoard({ tasks, onUpdateTasks, projectOwner }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<KanbanStatus | null>(null);
  const [newTasksInputs, setNewTasksInputs] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleDragStart = (id: string) => {
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: KanbanStatus) => {
    e.preventDefault();
    setOverCol(col);
  };

  const handleDrop = (col: KanbanStatus) => {
    if (!dragId) return;
    const updated = tasks.map(t => (t.id === dragId ? { ...t, status: col } : t));
    onUpdateTasks(updated);
    setDragId(null);
    setOverCol(null);
  };

  const handleAddTask = (col: KanbanStatus) => {
    const text = newTasksInputs[col]?.trim();
    if (!text) return;

    const newTask: Task = {
      id: generateRandomTaskId(),
      name: text,
      assignee: projectOwner || 'Unassigned',
      status: col,
      priority: 'Medium',
      progress: 0,
      dueDate: getDefaultDueDate(),
      tags: ['Task'],
      responsible: projectOwner || 'Unassigned',
      accountable: projectOwner || 'Unassigned'
    };

    onUpdateTasks([...tasks, newTask]);
    setNewTasksInputs(prev => ({ ...prev, [col]: '' }));
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    const updated = tasks.map(t => (t.id === editingTask.id ? editingTask : t));
    onUpdateTasks(updated);
    setEditingTask(null);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    onUpdateTasks(updated);
    setEditingTask(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start h-[640px]">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        const isOver = overCol === col.key;

        return (
          <div
            key={col.key}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={() => setOverCol(null)}
            onDrop={() => handleDrop(col.key)}
            className={`flex-shrink-0 w-64 rounded-xl p-3 flex flex-col max-h-full border transition-all ${col.bg} ${
              isOver ? 'border-dashed border-indigo-400 scale-[1.01]' : col.border
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[12px] font-bold ${col.text}`}>{col.label}</span>
              <span className="text-[10px] font-bold text-slate-550 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-xs">
                {colTasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[100px] pr-1">
              {colTasks.map(t => {
                const initials = getInitials(t.assignee);
                const pColor =
                  t.priority === 'Critical' ? 'bg-red-500' :
                  t.priority === 'High' ? 'bg-orange-500' :
                  t.priority === 'Medium' ? 'bg-amber-500' : 'bg-green-500';

                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => handleDragStart(t.id)}
                    className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs cursor-grab active:cursor-grabbing hover:border-slate-350 hover:shadow-sm transition-all group relative"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${pColor}`} title={`${t.priority} Priority`} />
                      <span className="text-[10px] font-mono text-slate-400" title="Task ID">{t.id}</span>
                    </div>

                    {/* Task Title */}
                    <h4 className="text-[12.5px] font-semibold text-slate-800 leading-snug mb-2 group-hover:text-indigo-650 transition-colors">
                      {t.name}
                    </h4>

                    {/* Tags */}
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {t.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-650 text-[9.5px] font-semibold">
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress indicator */}
                    {t.status !== 'Completed' && t.progress > 0 && (
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${t.progress}%` }} />
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-500">{t.progress}%</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10.5px]">
                      {t.dueDate ? (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(t.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingTask(t)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded transition-all mr-1 cursor-pointer animate-fade-in"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <div
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white shadow-inner flex-shrink-0"
                          title={`Assigned to: ${t.assignee}`}
                        >
                          {initials}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className="py-6 text-center text-[10.5px] text-slate-450 border-2 border-dashed border-slate-200/50 rounded-xl bg-white/30">
                  Drop tasks here
                </div>
              )}
            </div>

            {/* Column Footer: Inline input */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/40 flex items-center gap-1 bg-white/20 p-1.5 rounded-lg">
              <input
                type="text"
                placeholder="New task name..."
                value={newTasksInputs[col.key] || ''}
                onChange={e => setNewTasksInputs(prev => ({ ...prev, [col.key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddTask(col.key)}
                className="bg-white border border-slate-200 rounded-md py-1 px-2 text-[11px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 flex-1 min-w-0"
              />
              <button
                onClick={() => handleAddTask(col.key)}
                className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Task Edit Popup Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-[14px] font-bold text-slate-850 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-500" />
                Edit Task Details
              </h2>
              <span className="text-[10px] font-mono text-slate-400">{editingTask.id}</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Task Title</label>
                <input
                  type="text"
                  value={editingTask.name}
                  onChange={e => setEditingTask(t => t ? { ...t, name: e.target.value } : null)}
                  className="x-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Assignee</label>
                  <input
                    type="text"
                    value={editingTask.assignee}
                    onChange={e => setEditingTask(t => t ? { ...t, assignee: e.target.value } : null)}
                    className="x-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={e => setEditingTask(t => t ? { ...t, priority: e.target.value as any } : null)}
                    className="x-input w-full"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={editingTask.startDate || ''}
                    onChange={e => setEditingTask(t => t ? { ...t, startDate: e.target.value } : null)}
                    className="x-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Due/End Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || editingTask.endDate || ''}
                    onChange={e => setEditingTask(t => t ? { ...t, dueDate: e.target.value, endDate: e.target.value } : null)}
                    className="x-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTask.progress}
                    onChange={e => setEditingTask(t => t ? { ...t, progress: Math.min(100, Math.max(0, Number(e.target.value))) } : null)}
                    className="x-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Milestone</label>
                  <select
                    value={editingTask.isMilestone ? 'yes' : 'no'}
                    onChange={e => setEditingTask(t => t ? { ...t, isMilestone: e.target.value === 'yes' } : null)}
                    className="x-input w-full"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes (Milestone)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-550 mb-1 uppercase">Tags (comma separated)</label>
                <input
                  type="text"
                  value={(editingTask.tags || []).join(', ')}
                  onChange={e => setEditingTask(t => t ? { ...t, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) } : null)}
                  className="x-input w-full"
                  placeholder="e.g. Frontend, Design"
                />
              </div>

              <div className="pt-3 border-t border-slate-105 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(editingTask.id)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-red-650 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="x-btn x-btn-secondary py-1.5 px-3 text-[12px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="x-btn x-btn-primary py-1.5 px-3 text-[12px]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
