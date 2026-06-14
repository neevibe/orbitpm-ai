'use client';

import { useMemo, useState } from 'react';
import { Table2, KanbanSquare, GanttChartSquare, X, Flag } from 'lucide-react';
import {
  useApp, STATUS_META, PRIORITY_META, type Task, type TaskStatus,
} from '@/context/AppContext';

type ViewKey = 'table' | 'kanban' | 'gantt';

const VIEWS: { key: ViewKey; label: string; icon: typeof Table2 }[] = [
  { key: 'table', label: 'Table', icon: Table2 },
  { key: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { key: 'gantt', label: 'Timeline', icon: GanttChartSquare },
];

function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const m = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide"
      style={{ color: m.color, background: m.bg }}>{m.label}</span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/[\s.]+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{initials}</div>
      <span className="text-[12.5px] text-[#475569]">{name}</span>
    </div>
  );
}

/* ---------------- Table View ---------------- */
function TableView({ tasks }: { tasks: Task[] }) {
  const { domains } = useApp();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left">
            {['Task Name', 'Domain', 'Status', 'Assignee', 'Due Date', 'Priority', 'Progress'].map(h => (
              <th key={h} className="text-[10.5px] font-bold uppercase tracking-wider text-[#94a3b8] px-3 py-2.5 border-b border-[#eef2f7] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const dom = domains.find(d => d.key === t.domain)!;
            return (
              <tr key={t.id} className="hover:bg-[#f8fafc] transition-colors group">
                <td className="px-3 py-2.5 border-b border-[#f1f5f9]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-6 rounded-full" style={{ background: dom.color }} />
                    <div>
                      <p className="text-[13px] font-semibold text-[#1e293b] leading-tight">{t.title}</p>
                      <p className="text-[10.5px] text-[#94a3b8] font-mono">{t.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 border-b border-[#f1f5f9]">
                  <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md" style={{ color: dom.color, background: dom.soft }}>{dom.short}</span>
                </td>
                <td className="px-3 py-2.5 border-b border-[#f1f5f9]"><StatusBadge status={t.status} /></td>
                <td className="px-3 py-2.5 border-b border-[#f1f5f9]"><Avatar name={t.assignee} /></td>
                <td className="px-3 py-2.5 border-b border-[#f1f5f9] text-[12.5px] text-[#475569] whitespace-nowrap">{new Date(t.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                <td className="px-3 py-2.5 border-b border-[#f1f5f9]"><PriorityBadge priority={t.priority} /></td>
                <td className="px-3 py-2.5 border-b border-[#f1f5f9]">
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <div className="flex-1 h-1.5 rounded-full bg-[#eef2f7] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: dom.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-[#64748b] w-8 text-right">{t.progress}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tasks.length === 0 && <Empty />}
    </div>
  );
}

/* ---------------- Kanban View (HTML5 drag & drop) ---------------- */
const KANBAN_COLS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'delayed', label: 'Delayed' },
];

function KanbanView({ tasks }: { tasks: Task[] }) {
  const { domains, updateTaskStatus } = useApp();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {KANBAN_COLS.map(col => {
        const m = STATUS_META[col.key];
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
            onDragLeave={() => setOver(o => (o === col.key ? null : o))}
            onDrop={() => { if (dragId) updateTaskStatus(dragId, col.key); setDragId(null); setOver(null); }}
            className="rounded-xl p-2.5 transition-colors"
            style={{ background: over === col.key ? m.bg : '#f8fafc', border: `1.5px ${over === col.key ? 'dashed' : 'solid'} ${over === col.key ? m.border : '#eef2f7'}`, minHeight: 160 }}
          >
            <div className="flex items-center justify-between px-1 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className="text-[12px] font-bold text-[#334155]">{col.label}</span>
              </div>
              <span className="text-[11px] font-bold text-[#94a3b8] bg-white rounded-full px-1.5 py-0.5 border border-[#eef2f7]">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.map(t => {
                const dom = domains.find(d => d.key === t.domain)!;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    className="bg-white rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
                    style={{ border: '1px solid #eef2f7', borderLeft: `3px solid ${dom.color}`, opacity: dragId === t.id ? 0.5 : 1 }}
                  >
                    <p className="text-[12px] font-semibold text-[#1e293b] leading-snug mb-2">{t.title}</p>
                    <div className="flex items-center justify-between">
                      <PriorityBadge priority={t.priority} />
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold text-white" style={{ background: dom.color }}>
                        {t.assignee.split(/[\s.]+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && <p className="text-[11px] text-[#cbd5e1] text-center py-4">Drop tasks here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Gantt / Timeline View ---------------- */
const DAYS = 14;
function GanttView({ tasks }: { tasks: Task[] }) {
  const { domains, milestones, activeDomain } = useApp();
  const dayLabels = useMemo(() => Array.from({ length: DAYS }, (_, i) => {
    const d = new Date('2026-06-11');
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }), []);
  const visibleMilestones = milestones.filter(m => !activeDomain || m.domain === activeDomain);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 720 }}>
        {/* header row */}
        <div className="flex items-stretch border-b border-[#eef2f7] sticky top-0">
          <div className="w-52 flex-shrink-0 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-[#94a3b8]">Task</div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
            {dayLabels.map((d, i) => (
              <div key={i} className="text-[9px] text-center text-[#94a3b8] font-medium py-2 border-l border-[#f1f5f9]">{d}</div>
            ))}
          </div>
        </div>
        {/* rows */}
        {tasks.map(t => {
          const dom = domains.find(d => d.key === t.domain)!;
          const span = t.endDay - t.startDay + 1;
          return (
            <div key={t.id} className="flex items-center border-b border-[#f5f7fa] hover:bg-[#f8fafc] transition-colors">
              <div className="w-52 flex-shrink-0 px-3 py-2.5">
                <p className="text-[12px] font-semibold text-[#1e293b] truncate">{t.title}</p>
                <p className="text-[10px] text-[#94a3b8]">{t.assignee}</p>
              </div>
              <div className="flex-1 grid relative py-2.5" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
                {Array.from({ length: DAYS }).map((_, i) => <div key={i} className="border-l border-[#f5f7fa] h-7" />)}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center px-2 shadow-sm"
                  style={{
                    left: `${(t.startDay / DAYS) * 100}%`,
                    width: `${(span / DAYS) * 100}%`,
                    background: t.status === 'delayed' ? '#fecaca' : dom.soft,
                    border: `1px solid ${t.status === 'delayed' ? '#ef4444' : dom.color}`,
                  }}
                >
                  <div className="h-1.5 rounded-full flex-1" style={{ background: '#ffffff80' }}>
                    <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: dom.color }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {/* milestones strip */}
        {visibleMilestones.length > 0 && (
          <div className="flex items-center border-t border-[#eef2f7] bg-[#fafbfd]">
            <div className="w-52 flex-shrink-0 px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5"><Flag className="w-3 h-3" />Milestones</div>
            <div className="flex-1 grid relative py-2.5" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
              {Array.from({ length: DAYS }).map((_, i) => <div key={i} className="border-l border-[#f5f7fa] h-6" />)}
              {visibleMilestones.map(ms => {
                const dom = domains.find(d => d.key === ms.domain)!;
                return (
                  <div key={ms.id} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${(ms.day / DAYS) * 100}%` }} title={ms.title}>
                    <div className="w-3 h-3 rotate-45 -translate-x-1/2" style={{ background: ms.reached ? dom.color : '#fff', border: `2px solid ${dom.color}` }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {tasks.length === 0 && <Empty />}
    </div>
  );
}

function Empty() {
  return <div className="py-12 text-center text-[13px] text-[#94a3b8]">No tasks in this domain.</div>;
}

/* ---------------- Container ---------------- */
export default function ProjectViews() {
  const { tasks, activeDomain, setActiveDomain, domains } = useApp();
  const [view, setView] = useState<ViewKey>('table');
  const filtered = useMemo(() => (activeDomain ? tasks.filter(t => t.domain === activeDomain) : tasks), [tasks, activeDomain]);
  const activeMeta = activeDomain ? domains.find(d => d.key === activeDomain) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid #e8edf3', boxShadow: '0 10px 40px -20px rgba(15,23,42,0.2)' }}>
      {/* toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#eef2f7] flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f1f5f9]">
            {VIEWS.map(v => {
              const Icon = v.icon;
              const on = view === v.key;
              return (
                <button key={v.key} onClick={() => setView(v.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
                  style={{ background: on ? '#fff' : 'transparent', color: on ? '#4f46e5' : '#64748b', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.1)' : 'none' }}>
                  <Icon className="w-4 h-4" />{v.label}
                </button>
              );
            })}
          </div>
          <span className="text-[12px] text-[#94a3b8] font-medium ml-1">{filtered.length} tasks</span>
        </div>
        {activeMeta && (
          <button onClick={() => setActiveDomain(null)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{ color: activeMeta.color, background: activeMeta.soft }}>
            Filtered: {activeMeta.short}
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-3">
        {view === 'table' && <TableView tasks={filtered} />}
        {view === 'kanban' && <KanbanView tasks={filtered} />}
        {view === 'gantt' && <GanttView tasks={filtered} />}
      </div>
    </div>
  );
}
