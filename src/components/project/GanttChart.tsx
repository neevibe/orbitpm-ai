'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut, Calendar, Link2, AlertCircle } from 'lucide-react';
import { Task } from './KanbanBoard';

type ZoomLevel = 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year';

interface GanttChartProps {
  tasks: Task[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
  projectStartDate?: string | null;
  projectTargetDate?: string | null;
}

export default function GanttChart({ tasks, onUpdateTasks, projectStartDate, projectTargetDate }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('Month');
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<{ path: string; isCritical: boolean }[]>([]);

  // Dragging states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [initialX, setInitialX] = useState(0);
  const [initialStart, setInitialStart] = useState<string | null>(null);
  const [initialEnd, setInitialEnd] = useState<string | null>(null);

  // 1. Calculate timeline range
  const { minDate, maxDate } = useMemo(() => {
    let start = projectStartDate ? new Date(projectStartDate) : new Date();
    let end = projectTargetDate ? new Date(projectTargetDate) : new Date(start.getTime() + 86400000 * 90);

    tasks.forEach(t => {
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (d < start) start = d;
      }
      const dEnd = t.dueDate || t.endDate;
      if (dEnd) {
        const d = new Date(dEnd);
        if (d > end) end = d;
      }
    });

    // Add padding (15 days before, 30 days after)
    start = new Date(start.getTime() - 86400000 * 15);
    end = new Date(end.getTime() + 86400000 * 30);

    return { minDate: start, maxDate: end };
  }, [tasks, projectStartDate, projectTargetDate]);

  // 2. Generate time columns based on zoom level
  const timeColumns = useMemo(() => {
    const cols = [];
    const curr = new Date(minDate);

    if (zoom === 'Day') {
      // Limit to max 60 columns to prevent freeze
      for (let i = 0; i < 60 && curr <= maxDate; i++) {
        cols.push({
          id: curr.toISOString().split('T')[0],
          label: curr.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          date: new Date(curr),
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (zoom === 'Week') {
      while (curr <= maxDate) {
        cols.push({
          id: curr.toISOString().split('T')[0],
          label: `Wk ${getWeekNumber(curr)}`,
          date: new Date(curr),
        });
        curr.setDate(curr.getDate() + 7);
      }
    } else if (zoom === 'Month') {
      while (curr <= maxDate) {
        cols.push({
          id: `${curr.getFullYear()}-${curr.getMonth()}`,
          label: curr.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          date: new Date(curr),
        });
        curr.setMonth(curr.getMonth() + 1);
      }
    } else if (zoom === 'Quarter') {
      while (curr <= maxDate) {
        const q = Math.floor(curr.getMonth() / 3) + 1;
        cols.push({
          id: `${curr.getFullYear()}-Q${q}`,
          label: `${curr.getFullYear()} Q${q}`,
          date: new Date(curr),
        });
        curr.setMonth(curr.getMonth() + 3);
      }
    } else { // Year
      while (curr <= maxDate) {
        cols.push({
          id: `${curr.getFullYear()}`,
          label: `${curr.getFullYear()}`,
          date: new Date(curr),
        });
        curr.setFullYear(curr.getFullYear() + 1);
      }
    }
    return cols;
  }, [minDate, maxDate, zoom]);

  function getWeekNumber(d: Date) {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  }

  // 3. Compute Critical Path
  const criticalPathTasks = useMemo(() => {
    if (!showCriticalPath || tasks.length === 0) return new Set<string>();

    const critical = new Set<string>();
    
    // Simple critical path calculation: 
    // - Find tasks with the latest end dates
    // - Recursively add their dependencies if they finish exactly when the successor starts (zero slack)
    let latestEndTask: Task | null = null;
    let latestEndTime = 0;

    tasks.forEach(t => {
      const endTime = t.endDate ? new Date(t.endDate).getTime() : 0;
      if (endTime > latestEndTime) {
        latestEndTime = endTime;
        latestEndTask = t;
      }
    });

    if (!latestEndTask) return critical;

    function visit(task: Task) {
      critical.add(task.id);
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          const depTask = tasks.find(x => x.id === depId);
          if (depTask) {
            // zero slack logic: if dep ends near successor start
            visit(depTask);
          }
        });
      }
    }

    visit(latestEndTask);
    return critical;
  }, [tasks, showCriticalPath]);

  // 4. Filter hierarchy collapse state
  const visibleTasks = useMemo(() => {
    // Only return tasks if parent is not collapsed
    return tasks.filter(t => {
      if (!t.parentId) return true;
      let currParentId: string | null | undefined = t.parentId;
      while (currParentId) {
        if (collapsedTasks.has(currParentId)) return false;
        const parent = tasks.find(x => x.id === currParentId);
        currParentId = parent?.parentId;
      }
      return true;
    });
  }, [tasks, collapsedTasks]);

  const toggleCollapse = (id: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 5. Position calculations
  const totalDays = (maxDate.getTime() - minDate.getTime()) / 86400000;
  
  function getXPosition(dateStr: string | undefined) {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const offset = (date.getTime() - minDate.getTime()) / 86400000;
    return Math.max(0, Math.min(100, (offset / totalDays) * 100));
  }

  function getWidthPercent(startDateStr: string | undefined, endDateStr: string | undefined) {
    if (!startDateStr || !endDateStr) return 5; // Default short span
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const span = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
    return Math.max(1, (span / totalDays) * 100);
  }

  // 6. Interactive Rescheduling Handlers
  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.stopPropagation();
    e.preventDefault();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDraggedTaskId(taskId);
    setDragType(type);
    setInitialX(e.clientX);
    setInitialStart(task.startDate || new Date().toISOString().split('T')[0]);
    setInitialEnd(task.endDate || task.dueDate || new Date().toISOString().split('T')[0]);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedTaskId || !dragType || !initialStart || !initialEnd) return;

      const deltaX = e.clientX - initialX;
      // Convert screen px delta to days
      // container width / totalDays = px per day
      const width = containerRef.current?.getBoundingClientRect().width || 1000;
      const pxPerDay = width / totalDays;
      const daysDelta = Math.round(deltaX / pxPerDay);

      if (daysDelta === 0) return;

      const task = tasks.find(t => t.id === draggedTaskId);
      if (!task) return;

      let newStart = initialStart;
      let newEnd = initialEnd;

      if (dragType === 'move') {
        const startD = new Date(initialStart);
        const endD = new Date(initialEnd);
        startD.setDate(startD.getDate() + daysDelta);
        endD.setDate(endD.getDate() + daysDelta);
        newStart = startD.toISOString().split('T')[0];
        newEnd = endD.toISOString().split('T')[0];
      } else if (dragType === 'resize-start') {
        const startD = new Date(initialStart);
        startD.setDate(startD.getDate() + daysDelta);
        if (startD < new Date(initialEnd)) {
          newStart = startD.toISOString().split('T')[0];
        }
      } else if (dragType === 'resize-end') {
        const endD = new Date(initialEnd);
        endD.setDate(endD.getDate() + daysDelta);
        if (endD > new Date(initialStart)) {
          newEnd = endD.toISOString().split('T')[0];
        }
      }

      const updated = tasks.map(t =>
        t.id === draggedTaskId
          ? { ...t, startDate: newStart, endDate: newEnd, dueDate: newEnd }
          : t
      );
      onUpdateTasks(updated);
    };

    const handleMouseUp = () => {
      setDraggedTaskId(null);
      setDragType(null);
      setInitialStart(null);
      setInitialEnd(null);
    };

    if (draggedTaskId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedTaskId, dragType, initialX, initialStart, initialEnd, totalDays, tasks, onUpdateTasks]);

  // 7. Draw dependency arrows using SVG
  useEffect(() => {
    if (!containerRef.current || visibleTasks.length === 0) return;

    const timer = setTimeout(() => {
      const lines: { path: string; isCritical: boolean }[] = [];
      const containerRect = containerRef.current!.getBoundingClientRect();

      visibleTasks.forEach(task => {
        if (!task.dependencies) return;

        // Target (successor) bar element
        const targetEl = document.getElementById(`gantt-bar-${task.id}`);
        if (!targetEl) return;
        const targetRect = targetEl.getBoundingClientRect();

        task.dependencies.forEach(depId => {
          // Source (predecessor) bar element
          const sourceEl = document.getElementById(`gantt-bar-${depId}`);
          if (!sourceEl) return;
          const sourceRect = sourceEl.getBoundingClientRect();

          // Calculate coords relative to Gantt grid container
          const startX = sourceRect.right - containerRect.left;
          const startY = sourceRect.top + sourceRect.height / 2 - containerRect.top;

          const endX = targetRect.left - containerRect.left;
          const endY = targetRect.top + targetRect.height / 2 - containerRect.top;

          // Draw bezier curve for connecting dependency
          const midX = startX + (endX - startX) / 2;
          const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
          
          const isCritical = criticalPathTasks.has(task.id) && criticalPathTasks.has(depId);
          lines.push({ path, isCritical });
        });
      });

      setSvgLines(lines);
    }, 150);

    return () => clearTimeout(timer);
  }, [visibleTasks, criticalPathTasks, zoom, collapsedTasks]);

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col h-[580px]">
      {/* Gantt Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-wrap gap-2.5">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-lg">
          {['Day', 'Week', 'Month', 'Quarter', 'Year'].map(z => (
            <button
              key={z}
              onClick={() => setZoom(z as ZoomLevel)}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                zoom === z
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
              showCriticalPath
                ? 'bg-red-50 text-red-650 border-red-200'
                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Critical Path
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto flex" ref={containerRef}>
        {/* Left Side: Tasks Tree Table */}
        <div className="w-72 border-r border-slate-200 flex-shrink-0 flex flex-col bg-slate-50 sticky left-0 z-20">
          <div className="h-10 border-b border-slate-200 flex items-center px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Task Hierarchy
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-hidden">
            {visibleTasks.map(t => {
              const hasChildren = tasks.some(x => x.parentId === t.id);
              const isCollapsed = collapsedTasks.has(t.id);
              const indent = t.parentId ? 'pl-8' : 'pl-3';

              return (
                <div key={t.id} className="h-11 flex items-center px-3 hover:bg-slate-100 transition-colors">
                  <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${indent}`}>
                    {hasChildren ? (
                      <button
                        onClick={() => toggleCollapse(t.id)}
                        className="p-0.5 rounded hover:bg-slate-200 text-slate-550 flex-shrink-0 cursor-pointer"
                      >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <span className="w-4.5" />
                    )}
                    <span className="text-[12px] font-semibold text-slate-700 truncate" title={t.name}>
                      {t.name}
                    </span>
                  </div>
                  {t.isMilestone && (
                    <span className="text-[8px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded px-1 flex-shrink-0 ml-1.5 uppercase">
                      MS
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Timeline Visualization */}
        <div className="flex-1 flex flex-col relative" style={{ minWidth: 800 }}>
          {/* Timeline header */}
          <div className="h-10 border-b border-slate-200 flex sticky top-0 bg-white z-10">
            {timeColumns.map(col => (
              <div
                key={col.id}
                className="flex-1 border-l border-slate-150 flex items-center justify-center text-[10px] font-semibold text-slate-450"
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* SVG Overlay for drawing dependency paths */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
              </marker>
              <marker id="arrow-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
              </marker>
            </defs>
            {svgLines.map((line, idx) => (
              <path
                key={idx}
                d={line.path}
                fill="none"
                stroke={line.isCritical ? '#ef4444' : '#818cf8'}
                strokeWidth={line.isCritical ? 2 : 1.5}
                strokeDasharray={line.isCritical ? 'none' : '3, 3'}
                markerEnd={line.isCritical ? 'url(#arrow-critical)' : 'url(#arrow)'}
              />
            ))}
          </svg>

          {/* Rows */}
          <div className="flex-1 divide-y divide-slate-100 relative z-10">
            {visibleTasks.map(t => {
              const xLeft = getXPosition(t.startDate);
              const xWidth = getWidthPercent(t.startDate, t.endDate || t.dueDate);
              const isCritical = criticalPathTasks.has(t.id);

              return (
                <div key={t.id} className="h-11 relative flex items-center hover:bg-slate-50/50 transition-colors">
                  {/* Grid background lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timeColumns.map((col, i) => (
                      <div key={i} className="flex-1 border-l border-slate-100/50 h-full" />
                    ))}
                  </div>

                  {/* Task Bar */}
                  {t.isMilestone ? (
                    // Milestone Diamond shape
                    <div
                      id={`gantt-bar-${t.id}`}
                      style={{ left: `calc(${xLeft}% - 8px)` }}
                      className="absolute w-4.5 h-4.5 rotate-45 border-2 bg-amber-500 border-amber-600 shadow-xs cursor-move z-10"
                      onMouseDown={e => handleMouseDown(e, t.id, 'move')}
                      title={`Milestone: ${t.name} (Due: ${t.dueDate})`}
                    />
                  ) : (
                    // Standard task horizontal bar
                    <div
                      id={`gantt-bar-${t.id}`}
                      style={{ left: `${xLeft}%`, width: `${xWidth}%` }}
                      className={`absolute h-6 rounded-md shadow-xs flex items-center overflow-hidden cursor-move border transition-shadow hover:shadow-md ${
                        isCritical
                          ? 'bg-red-50 border-red-500 shadow-sm shadow-red-100'
                          : 'bg-indigo-50 border-indigo-200'
                      }`}
                      onMouseDown={e => handleMouseDown(e, t.id, 'move')}
                    >
                      {/* Left Drag Resize Handle */}
                      <div
                        className="w-1.5 h-full hover:bg-indigo-300 cursor-ew-resize flex-shrink-0 opacity-0 hover:opacity-100 transition-opacity bg-indigo-200/50"
                        onMouseDown={e => handleMouseDown(e, t.id, 'resize-start')}
                      />

                      {/* Progress Fill */}
                      <div className="flex-1 h-full relative flex items-center px-2">
                        <div
                          className={`absolute top-0 bottom-0 left-0 ${isCritical ? 'bg-red-200/60' : 'bg-indigo-200/60'}`}
                          style={{ width: `${t.progress}%` }}
                        />
                        <span className="relative z-10 text-[9.5px] font-bold text-slate-700 truncate" title={`${t.name} (${t.progress}%)`}>
                          {t.name} ({t.progress}%)
                        </span>
                      </div>

                      {/* Right Drag Resize Handle */}
                      <div
                        className="w-1.5 h-full hover:bg-indigo-300 cursor-ew-resize flex-shrink-0 opacity-0 hover:opacity-100 transition-opacity bg-indigo-200/50"
                        onMouseDown={e => handleMouseDown(e, t.id, 'resize-end')}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
