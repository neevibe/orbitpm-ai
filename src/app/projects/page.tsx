'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, LayoutGrid, Table2, History, RotateCcw, Trash2, Archive, BarChartHorizontal, ChevronDown, ChevronRight, MoreVertical, Edit2, FolderOpen, Download, Filter } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { TOP_LEVEL_DEPARTMENTS, departmentDisplayName, resolveHierarchy, getSubdivisions, hasSubdivisions } from '@/lib/org-structure';
import ProjectModal from '@/components/modals/ProjectModal';
import DependencyTaskModal from '@/components/modals/DependencyTaskModal';
import type { Project } from '@/lib/mock-data';
import DepartmentLabel from '@/components/DepartmentLabel';
import { useToast, useConfirm, StatusBadge, PriorityBadge } from '@/components/ui';

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
  const searchParams = useSearchParams();
  const { projects: activeProjects, archivedProjects, departments, risks, archiveProject, restoreProject, purgeProject, updateProject } = useData();
  const { user, isDemoMode, canModifyDepartment, isAdmin } = useAuth();
  const currentUserName = isDemoMode
    ? 'Demo User'
    : (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || '';
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [view, setView] = useState<'list' | 'kanban' | 'gantt'>('list');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  // Dedicated dependency-task view for read-only internal mirror rows.
  const [taskMirror, setTaskMirror] = useState<{ parentId: string; depId: string } | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newProjectDept, setNewProjectDept] = useState<string | null>(null);
  const [newProjectSub, setNewProjectSub] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedQuarters, setExpandedQuarters] = useState<Record<string, boolean>>({
    Q1: true,
    Q2: false,
    Q3: false,
    Q4: false
  });

  const [stuckFilter, setStuckFilter] = useState(false);
  const [hasRisksFilter, setHasRisksFilter] = useState(false);
  const [escalationFilter, setEscalationFilter] = useState(false);
  const [bottlenecksFilter, setBottlenecksFilter] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'owner'>('id');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  // Close filters panel on outside click (avoids z-index stacking context conflict with overlay).
  useEffect(() => {
    if (!showFiltersPanel) return;
    const handle = (e: MouseEvent) => {
      if (filtersPanelRef.current && !filtersPanelRef.current.contains(e.target as Node)) {
        setShowFiltersPanel(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showFiltersPanel]);

  useEffect(() => {
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const dept = searchParams.get('department');
    const sub = searchParams.get('subdivision');
    const q = searchParams.get('search');
    const stuck = searchParams.get('stuck') === 'true';
    const hasRisks = searchParams.get('hasRisks') === 'true';
    const escalation = searchParams.get('escalation') === 'true';
    const bottlenecks = searchParams.get('bottlenecks') === 'true';

    setTimeout(() => {
      if (status) {
        setStatusFilter(status);
      }
      if (priority) {
        setPriorityFilter(priority);
      }
      if (dept) {
        setSelectedDept(dept);
      }
      if (sub) {
        setSelectedSub(sub);
      } else {
        setSelectedSub(null);
      }
      if (q) {
        setSearch(q);
      }
      setStuckFilter(stuck);
      setHasRisksFilter(hasRisks);
      setEscalationFilter(escalation);
      setBottlenecksFilter(bottlenecks);
    }, 0);
  }, [searchParams]);

  // Restore filter state when navigating back from a project detail page.
  useEffect(() => {
    const saved = sessionStorage.getItem('xyrenis_projects_filters');
    if (saved) {
      try {
        const f = JSON.parse(saved);
        sessionStorage.removeItem('xyrenis_projects_filters');
        setTimeout(() => {
          if (f.search) setSearch(f.search);
          if (f.statusFilter) setStatusFilter(f.statusFilter);
          if (f.priorityFilter) setPriorityFilter(f.priorityFilter);
          if (f.selectedDept) setSelectedDept(f.selectedDept);
          setSelectedSub(f.selectedSub ?? null);
          if (f.ownerFilter) setOwnerFilter(f.ownerFilter);
          if (f.myProjectsOnly) setMyProjectsOnly(f.myProjectsOnly);
          if (f.sortBy) setSortBy(f.sortBy);
        }, 0);
      } catch {}
    }
  }, []);

  // Owners scoped to the active department/subdivision selection so the list
  // only shows names relevant to what is currently visible.
  const allOwners = useMemo(() => {
    const pool = activeProjects.filter(p => {
      const vertical = resolveHierarchy(p.department, p.subdivision).vertical;
      const matchDept = selectedDept === 'All' || vertical === selectedDept;
      const matchSub = !selectedSub || p.subdivision === selectedSub;
      return matchDept && matchSub;
    });
    const names = new Set(pool.map(p => p.owner).filter(Boolean));
    return Array.from(names).sort();
  }, [activeProjects, selectedDept, selectedSub]);

  // Reset owner filter when switching departments if the chosen owner isn't in the new set.
  useEffect(() => {
    if (ownerFilter !== 'All' && !allOwners.includes(ownerFilter)) {
      setOwnerFilter('All');
    }
  }, [allOwners, ownerFilter]);

  const filtered = useMemo(() => {
    const pool = tab === 'active' ? activeProjects : archivedProjects;
    
    // For bottleneck calculations
    const ownerCounts: Record<string, number> = {};
    activeProjects.forEach(ap => {
      const countsAsWorkload = !ap.archived && ap.status !== 'Completed' && (ap.status as string) !== 'Cancelled';
      if (countsAsWorkload && ap.owner) {
        ownerCounts[ap.owner] = (ownerCounts[ap.owner] || 0) + 1;
      }
    });

    return pool.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q) || (p.subdivision || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      // Fold CBB→BASL etc. so filtering matches the displayed vertical.
      const vertical = resolveHierarchy(p.department, p.subdivision).vertical;
      const matchDept = selectedDept === 'All' || vertical === selectedDept;
      const matchSub = !selectedSub || p.subdivision === selectedSub;
      const matchPriority = priorityFilter === 'All' || p.priority === priorityFilter;

      // Query param overrides
      if (stuckFilter) {
        const todayStr = new Date().toISOString().split('T')[0];
        const isDelayed = p.status === 'Delayed';
        const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
        const isStuck = (isDelayed || isOverdue) && p.status !== 'Completed' && !p.archived;
        if (!isStuck) return false;
      }
      if (hasRisksFilter) {
        const hasOpenRisks = risks.some(r => r.projectId === p.id && r.status === 'Open');
        if (!hasOpenRisks) return false;
      }
      if (escalationFilter) {
        const hasOpenRisks = risks.some(r => r.projectId === p.id && r.status === 'Open') || (p.risks && p.risks.length > 0);
        const needsEscalation = p.priority === 'Critical' && p.status === 'In Progress' && hasOpenRisks;
        if (!needsEscalation) return false;
      }
      if (bottlenecksFilter) {
        const hasBottleneck = p.owner ? (ownerCounts[p.owner] || 0) >= 3 : false;
        if (!hasBottleneck) return false;
      }

      const matchOwner = ownerFilter === 'All' || p.owner === ownerFilter;
      const matchMyProjects = !myProjectsOnly || p.owner === currentUserName;
      return matchSearch && matchStatus && matchDept && matchSub && matchPriority && matchOwner && matchMyProjects;
    })
    .sort((a, b) => {
      if (sortBy === 'owner') return (a.owner || '').localeCompare(b.owner || '');
      return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [activeProjects, archivedProjects, tab, search, statusFilter, selectedDept, priorityFilter, stuckFilter, hasRisksFilter, escalationFilter, bottlenecksFilter, risks, ownerFilter, myProjectsOnly, sortBy, currentUserName]);

  const deptGroups = useMemo(() => {
    const groups: Record<string, Project[]> = {};
    filtered.forEach(p => {
      const vertical = resolveHierarchy(p.department, p.subdivision).vertical;
      if (!groups[vertical]) groups[vertical] = [];
      groups[vertical].push(p);
    });
    return groups;
  }, [filtered]);

  // Canonical verticals from org-structure (CBB folded into BASL), plus any
  // legacy department names still present in the data that aren't covered.
  const deptList = useMemo(() => {
    const known = new Set(TOP_LEVEL_DEPARTMENTS);
    const extra = departments
      .map(d => resolveHierarchy(d.name).vertical)
      .filter(v => !known.has(v));
    return [...TOP_LEVEL_DEPARTMENTS, ...Array.from(new Set(extra))];
  }, [departments]);

  const toggleCollapse = (dept: string) => {
    setCollapsedDepts(prev => {
      const n = new Set(prev);
      if (n.has(dept)) n.delete(dept); else n.add(dept);
      return n;
    });
  };

  const openNew = (dept?: string, sub?: string) => {
    setEditProject(null);
    setNewProjectDept(dept || null);
    setNewProjectSub(sub || null);
    setShowModal(true);
  };

  const openEdit = (p: Project) => { setEditProject(p); setShowModal(true); };
  const goToDetail = (id: string) => {
    sessionStorage.setItem('xyrenis_projects_filters', JSON.stringify({
      search, statusFilter, priorityFilter, selectedDept, selectedSub,
      ownerFilter, myProjectsOnly, sortBy,
    }));
    router.push(`/projects/${id}`);
  };

  // Mirror rows are internal dependency tasks — opening one shows the dedicated
  // Dependency Task view, never the standard project detail/edit modal.
  const openRow = (p: Project) => {
    if (p.isDependencyMirror && p.mirrorParentId && p.mirrorDepId) {
      setTaskMirror({ parentId: p.mirrorParentId, depId: p.mirrorDepId });
    } else {
      goToDetail(p.id);
    }
  };
  const openRowEdit = (p: Project) => {
    if (p.isDependencyMirror && p.mirrorParentId && p.mirrorDepId) {
      setTaskMirror({ parentId: p.mirrorParentId, depId: p.mirrorDepId });
    } else {
      openEdit(p);
    }
  };

  // Export all current (live, edited) data to a re-importable Excel workbook.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects: activeProjects, risks, departments }) });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Xyrenis_Projects_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast('Projects exported to Excel.', 'success');
    } catch { toast('Export failed. Please try again.', 'error'); }
    setIsExporting(false);
  };

  return (
    <div className="flex flex-1 animate-fade-in bg-[var(--color-x-bg)]" style={{ height: 'calc(100vh - 52px)' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 flex-shrink-0 bg-[var(--color-x-surface)] border-r border-[var(--color-x-border)] flex flex-col z-10" style={{ minHeight: '100%' }}>
        <div className="px-5 py-4 border-b border-[var(--color-x-border)]">
          <p className="text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-[0.08em]">Departments</p>
        </div>
        <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          <button
            onClick={() => {
              setSelectedDept('All');
              setSelectedSub(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-all ${selectedDept === 'All' ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] hover:text-[var(--color-x-text)]'}`}
          >
            <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selectedDept === 'All' ? 'text-indigo-600' : 'text-[var(--color-x-text-muted)]'}`} />
            <span className="truncate">All Departments</span>
            <span className="ml-auto text-[11px] font-mono">{activeProjects.length}</span>
          </button>
          {deptList.map(dept => {
            const count = activeProjects.filter(p => resolveHierarchy(p.department, p.subdivision).vertical === dept).length;
            const isSelected = selectedDept === dept;
            const subdivisions = getSubdivisions(dept);
            return (
              <div key={dept} className="space-y-0.5">
                <button
                  key={dept}
                  onClick={() => {
                    setSelectedDept(dept);
                    setSelectedSub(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-all ${isSelected && !selectedSub ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-sm' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] hover:text-[var(--color-x-text)]'}`}
                >
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${isSelected && !selectedSub ? 'bg-indigo-600' : 'bg-[var(--color-x-text-muted)] opacity-50'}`} />
                  </div>
                  <span className="truncate flex-1">{departmentDisplayName(dept)}</span>
                  <span className={`ml-auto text-[11px] font-mono ${isSelected && !selectedSub ? 'text-indigo-500' : 'text-[var(--color-x-text-muted)]'}`}>{count}</span>
                </button>
                {isSelected && subdivisions.length > 0 && (
                  <div className="pl-6 space-y-0.5 border-l border-indigo-100/50 ml-5 my-0.5">
                    {subdivisions.map((sub: string) => {
                      const subCount = activeProjects.filter(p => {
                        const h = resolveHierarchy(p.department, p.subdivision);
                        return h.vertical === dept && h.subdivision === sub;
                      }).length;
                      const isSubSelected = selectedSub === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setSelectedSub(sub)}
                          className={`w-full text-left px-2.5 py-1 rounded-md text-[12px] flex items-center gap-2 transition-all ${isSubSelected ? 'bg-indigo-50/60 text-indigo-600 font-semibold shadow-sm' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] hover:text-[var(--color-x-text)]'}`}
                        >
                          <span className="truncate flex-1">{sub}</span>
                          <span className={`text-[10px] font-mono ${isSubSelected ? 'text-indigo-500 font-bold' : 'text-[var(--color-x-text-muted)]'}`}>{subCount}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-[var(--color-x-border)]">
          <button onClick={() => setTab(tab === 'history' ? 'active' : 'history')}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${tab === 'history' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100' : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)] border border-transparent'}`}>
            <History className="w-4 h-4" />
            Project Archive {archivedProjects.length > 0 && <span className="ml-auto bg-amber-200/50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{archivedProjects.length}</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-x-bg)]">

        {/* Top Bar */}
        <div className="bg-[var(--color-x-surface)] border-b border-[var(--color-x-border)] px-6 py-3 flex items-center gap-2 flex-shrink-0 z-10 shadow-sm">
          {/* Search */}
          <div className="relative" style={{ width: 200, flexShrink: 0 }}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="x-input pl-8"
              style={{ width: '100%', height: 32, fontSize: 13, padding: '0 12px 0 30px' }}
            />
          </div>
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="x-input"
            style={{ width: 120, height: 32, fontSize: 13, padding: '0 8px', flexShrink: 0 }}
          >
            {STATUS_OPTIONS.map(s => <option key={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="x-input"
            style={{ width: 120, height: 32, fontSize: 13, padding: '0 8px', flexShrink: 0 }}
          >
            {PRIORITY_OPTIONS.map(p => <option key={p}>{p === 'All' ? 'All Priority' : p}</option>)}
          </select>
          {/* Filters popover — Owner, My Projects, Sort */}
          <div ref={filtersPanelRef} className="relative flex-shrink-0">
            <button
              onClick={() => setShowFiltersPanel(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 rounded-md border text-[12px] font-semibold transition-colors ${(ownerFilter !== 'All' || myProjectsOnly || sortBy !== 'id') ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-[var(--color-x-surface)] text-[var(--color-x-text-secondary)] border-[var(--color-x-border)] hover:border-indigo-300 hover:text-[var(--color-x-text)]'}`}
              style={{ height: 32 }}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {(ownerFilter !== 'All' || myProjectsOnly || sortBy !== 'id') && (
                <span className="inline-flex w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] items-center justify-center font-bold">
                  {(ownerFilter !== 'All' ? 1 : 0) + (myProjectsOnly ? 1 : 0) + (sortBy !== 'id' ? 1 : 0)}
                </span>
              )}
            </button>
            {showFiltersPanel && (
              <div className="absolute top-10 left-0 z-50 bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-xl shadow-xl p-4 w-60 space-y-3 animate-scale-in">
                <div>
                  <p className="text-[10px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider mb-1.5">Owner</p>
                  <select
                    value={ownerFilter}
                    onChange={e => setOwnerFilter(e.target.value)}
                    className="x-input w-full"
                    style={{ height: 32, fontSize: 13, padding: '0 8px' }}
                  >
                    <option value="All">All Owners</option>
                    {allOwners.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {currentUserName && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[12px] font-medium text-[var(--color-x-text)]">My Projects only</span>
                    <button
                      onClick={() => setMyProjectsOnly(v => !v)}
                      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${myProjectsOnly ? 'bg-indigo-600' : 'bg-[var(--color-x-border)]'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${myProjectsOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider mb-1.5">Sort by</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSortBy('id')}
                      className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg border transition-all ${sortBy === 'id' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[var(--color-x-bg)] text-[var(--color-x-text-secondary)] border-[var(--color-x-border)] hover:border-indigo-300'}`}
                    >ID</button>
                    <button
                      onClick={() => setSortBy('owner')}
                      className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg border transition-all ${sortBy === 'owner' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[var(--color-x-bg)] text-[var(--color-x-text-secondary)] border-[var(--color-x-border)] hover:border-indigo-300'}`}
                    >Owner</button>
                  </div>
                </div>
                {(ownerFilter !== 'All' || myProjectsOnly || sortBy !== 'id') && (
                  <button
                    onClick={() => { setOwnerFilter('All'); setMyProjectsOnly(false); setSortBy('id'); }}
                    className="w-full text-[11px] font-semibold text-[var(--color-x-text-muted)] hover:text-red-600 py-0.5 text-center transition-colors border-t border-[var(--color-x-border)] pt-2"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
          {(stuckFilter || hasRisksFilter || escalationFilter || bottlenecksFilter) && (
            <button
              onClick={() => {
                setStuckFilter(false);
                setHasRisksFilter(false);
                setEscalationFilter(false);
                setBottlenecksFilter(false);
                router.replace('/projects');
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1 cursor-pointer transition-colors"
              style={{ height: 32 }}
            >
              Clear Special Filter
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0 bg-[var(--color-x-bg)] border border-[var(--color-x-border)] rounded-lg p-0.5">
            <button onClick={() => setView('list')} title="List" className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-[var(--color-x-surface)] shadow-sm text-indigo-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}><Table2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('kanban')} title="Kanban" className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-[var(--color-x-surface)] shadow-sm text-indigo-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView('gantt')} title="Gantt" className={`p-1.5 rounded-md transition-all ${view === 'gantt' ? 'bg-[var(--color-x-surface)] shadow-sm text-indigo-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}><BarChartHorizontal className="w-3.5 h-3.5" /></button>
          </div>
          {/* Export to Excel (re-importable workbook reflecting all in-app edits) */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            title="Download all projects as an Excel workbook (re-importable, reflects every in-app edit)"
            className="x-btn x-btn-secondary flex-shrink-0 disabled:opacity-60"
            style={{ height: 32, fontSize: 13, padding: '0 12px' }}
          >
            <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exporting…' : 'Export to Excel'}
          </button>
          {/* New Project */}
          <button
            onClick={() => openNew(selectedDept !== 'All' ? selectedDept : undefined, selectedSub || undefined)}
            className="x-btn x-btn-primary flex-shrink-0"
            style={{ height: 32, fontSize: 13, padding: '0 12px' }}
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="space-y-3">
              <div className="x-card p-5 border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                <p className="text-[13px] font-bold text-amber-800 mb-1 flex items-center gap-2"><Archive className="w-4 h-4" /> Archived Projects</p>
                <p className="text-[12px] text-amber-700/80">Projects here have been archived and removed from active tracking. You can restore or permanently delete them.</p>
              </div>
              {archivedProjects.length === 0 ? (
                <div className="x-card p-16 text-center">
                  <Archive className="w-10 h-10 text-[var(--color-x-border)] mx-auto mb-4" />
                  <p className="text-[14px] font-medium text-[var(--color-x-text-muted)]">No archived projects.</p>
                </div>
              ) : archivedProjects.map(p => (
                <div key={p.id} className="x-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Archive className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[var(--color-x-text-muted)]">{p.id}</span>
                        <StatusBadge status={p.status} className="text-[10px]" />
                      </div>
                      <p className="text-[14px] font-bold text-[var(--color-x-text)] truncate">{p.name}</p>
                      <div className="text-[12px] text-[var(--color-x-text-secondary)] flex items-center gap-1.5 flex-wrap mt-0.5">
                        <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" />
                        <span>·</span>
                        <span>{p.owner}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => restoreProject(p.id)} className="x-btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button onClick={async () => { if (await confirm({ title: 'Delete permanently?', message: `"${p.name}" will be permanently removed. This cannot be undone.`, confirmText: 'Delete', tone: 'danger' })) { purgeProject(p.id); toast('Project permanently deleted.', 'warning'); } }} className="x-btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── LIST VIEW: grouped by department ── */}
          {tab === 'active' && view === 'list' && (
            <div className="space-y-6">
              {Object.keys(deptGroups).length === 0 && (
                <div className="x-card p-16 text-center">
                  <FolderOpen className="w-10 h-10 text-[var(--color-x-border)] mx-auto mb-4" />
                  <p className="text-[14px] font-medium text-[var(--color-x-text-muted)]">No projects match your filters.</p>
                </div>
              )}
              {Object.entries(deptGroups).map(([dept, deptProjects]) => {
                const isCollapsed = collapsedDepts.has(dept);
                const hasSubs = hasSubdivisions(dept);
                const subdivisionsOfDept = getSubdivisions(dept);

                // Group projects by subdivision
                const subdivisionGroups = (() => {
                  if (!hasSubs) {
                    return [{ name: null, projects: deptProjects }];
                  }

                  const groups: { name: string | null; projects: Project[] }[] = [];

                  // Add each standard subdivision
                  subdivisionsOfDept.forEach((sub: string) => {
                    const subProjects = deptProjects.filter(p => {
                      const h = resolveHierarchy(p.department, p.subdivision);
                      return h.subdivision === sub;
                    });
                    if (subProjects.length > 0) {
                      groups.push({ name: sub, projects: subProjects });
                    }
                  });

                  // Add "General / No Subdivision" projects (projects without subdivision or whose subdivision is not in our list)
                  const otherProjects = deptProjects.filter(p => {
                    const h = resolveHierarchy(p.department, p.subdivision);
                    return !h.subdivision || !subdivisionsOfDept.includes(h.subdivision);
                  });
                  if (otherProjects.length > 0) {
                    groups.push({ name: 'General / Other', projects: otherProjects });
                  }

                  return groups;
                })();

                return (
                  <div key={dept} className="x-card-flush shadow-sm">
                    {/* Department Header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-[var(--color-x-surface)] border-b border-[var(--color-x-border)] cursor-pointer select-none" onClick={() => toggleCollapse(dept)}>
                      <div className="text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] transition-colors">
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      <div className="w-3 h-3 rounded-full flex-shrink-0 bg-indigo-500" />
                      <span className="text-[14px] font-bold text-[var(--color-x-text)]">
                        {departmentDisplayName(dept)}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--color-x-text-muted)] bg-[var(--color-x-bg)] px-2 py-0.5 rounded-full border border-[var(--color-x-border)]">{deptProjects.length} projects</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openNew(dept); }}
                        className="ml-auto flex items-center gap-1.5 text-[12px] text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-md font-semibold transition-colors border border-transparent hover:border-indigo-100"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Project
                      </button>
                    </div>

                    {/* Project Rows */}
                    {!isCollapsed && (
                      <div className="bg-[var(--color-x-surface)] divide-y divide-[var(--color-x-border)]">
                        {subdivisionGroups.map((group, gi) => (
                          <div key={group.name || `no-sub-${gi}`} className="overflow-x-auto">
                            {group.name && (
                              <div className="px-5 py-2.5 bg-[#f8fafc] border-b border-[var(--color-x-border)] flex items-center justify-between">
                                <span className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  {group.name}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-medium text-[var(--color-x-text-muted)] bg-white px-2 py-0.5 rounded-full border border-[var(--color-x-border)]">{group.projects.length} projects</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openNew(dept, (group.name === 'General / Other' || !group.name) ? undefined : group.name); }}
                                    className="text-[11px] text-indigo-600 hover:text-indigo-850 font-semibold flex items-center gap-0.5"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                </div>
                              </div>
                            )}
                            <table className="x-table w-full table-fixed min-w-[940px]">
                              <thead>
                                <tr>
                                  <th className="w-32 pl-5">ID</th>
                                  <th>Project Name</th>
                                  <th className="w-36">Owner</th>
                                  <th className="w-28">Status</th>
                                  <th className="w-24">Priority</th>
                                  <th className="w-36">Progress</th>
                                  <th className="w-24 text-right pr-5"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.projects.map(p => (
                                  <tr key={`${p.id}-${p.department}-${p.owner}`} onClick={() => openRow(p)} className="cursor-pointer group">
                                    <td className="pl-5 pr-3 font-mono text-[11px] text-[var(--color-x-text-muted)] whitespace-nowrap truncate" title={p.id}>{p.id}</td>
                                    <td>
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(p.status)}`} />
                                        <div className="min-w-0 flex items-center gap-2">
                                          <span className="font-semibold text-[13px] text-[var(--color-x-text)] group-hover:text-indigo-600 transition-colors truncate" title={p.name}>{p.name}</span>
                                          {p.isDependencyMirror && (
                                            <span
                                              title={`Mirrored from ${departmentDisplayName(p.originalDepartment || '')} via a dependency. Archive/Delete must happen in the source department.`}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-semibold text-indigo-600 whitespace-nowrap flex-shrink-0"
                                            >
                                              ↳ Mirror
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="truncate" title={p.owner}>{p.owner}</td>
                                    <td>
                                      <StatusBadge status={p.status} />
                                    </td>
                                    <td>
                                      <PriorityBadge priority={p.priority} />
                                    </td>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-[var(--color-x-bg)] rounded-full overflow-hidden border border-[var(--color-x-border)]">
                                          <div className={`h-full rounded-full ${p.progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${p.progress}%` }} />
                                        </div>
                                        <span className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] w-8 text-right">{p.progress}%</span>
                                      </div>
                                    </td>
                                    <td className="pr-5 text-right">
                                      <div className={`flex items-center justify-end gap-1.5 transition-opacity ${openMenuId === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        {(p.isDependencyMirror || (canModifyDepartment(p.department) && (isAdmin || p.owner === currentUserName))) && (
                                          <button onClick={e => { e.stopPropagation(); openRowEdit(p); }} className="p-2 rounded-md hover:bg-indigo-50 text-[var(--color-x-text-muted)] hover:text-indigo-600 transition-colors" title={p.isDependencyMirror ? 'Open dependency task' : 'Quick Edit'}><Edit2 className="w-4 h-4" /></button>
                                        )}
                                        {!p.isDependencyMirror && canModifyDepartment(p.department) && (isAdmin || p.owner === currentUserName) && (
                                          <div className="relative" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)} className="p-2 rounded-md hover:bg-[var(--color-x-bg)] text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] transition-colors" title="More options"><MoreVertical className="w-4 h-4" /></button>
                                            {openMenuId === p.id && (
                                              <div className="absolute right-0 top-10 z-50 bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-xl shadow-xl py-1 w-40 animate-scale-in">
                                                <button onClick={() => { archiveProject(p.id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-[12px] font-medium text-amber-600 hover:bg-amber-50">Archive Project</button>
                                                <div className="border-t border-[var(--color-x-border)] my-1" />
                                                <button onClick={async () => { setOpenMenuId(null); if (await confirm({ title: 'Delete permanently?', message: `Project ${p.id} ("${p.name}") will be permanently removed. This cannot be undone.`, confirmText: 'Delete', tone: 'danger' })) { purgeProject(p.id); toast('Project permanently deleted.', 'warning'); } }} className="w-full text-left px-4 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50">Delete Permanently</button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
              <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-140px)]">
                {Object.entries(groups).map(([status, cols]) => (
                  <div key={status} className="flex-shrink-0 w-[300px] flex flex-col max-h-full">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className={`x-badge ${getStatusColor(status) === 'bg-emerald-500' ? 'x-badge-green' : getStatusColor(status) === 'bg-red-500' ? 'x-badge-red' : getStatusColor(status) === 'bg-amber-400' ? 'x-badge-amber' : getStatusColor(status) === 'bg-blue-500' ? 'x-badge-blue' : 'x-badge-gray'} text-[11px]`}>{status}</span>
                      <span className="text-[11px] font-medium text-[var(--color-x-text-muted)] bg-[var(--color-x-surface)] px-2 py-0.5 rounded-full border border-[var(--color-x-border)]">{cols.length}</span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto px-1 pb-4">
                      {cols.map(p => (
                        <div key={`${p.id}-${p.department}-${p.owner}`} onClick={() => openRow(p)} className="x-card p-4 hover:border-indigo-400 cursor-pointer group">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`x-priority-${p.priority.toLowerCase()}`}>{p.priority}</span>
                            <span className="text-[10px] font-mono text-[var(--color-x-text-muted)]">{p.id}</span>
                          </div>
                          <p className="text-[13px] font-bold text-[var(--color-x-text)] leading-snug mb-1 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                          <div className="mb-2">
                            <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" className="text-[11px]" />
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                              {p.owner.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <p className="text-[11px] text-[var(--color-x-text-secondary)] truncate">{p.owner}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[var(--color-x-bg)] rounded-full overflow-hidden border border-[var(--color-x-border)]">
                              <div className={`h-full rounded-full ${p.progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-x-text-muted)]">{p.progress}%</span>
                          </div>
                        </div>
                      ))}
                      {cols.length === 0 && (
                        <div className="border-2 border-dashed border-[var(--color-x-border)] rounded-xl h-24 flex items-center justify-center">
                          <p className="text-[12px] text-[var(--color-x-text-muted)]">Drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── GANTT VIEW ── */}
          {/* ── GANTT VIEW ── */}
          {tab === 'active' && view === 'gantt' && (() => {
            const cy = new Date().getFullYear();
            
            const getFiscalMonthFraction = (dateStr: string | undefined, defaultDate: Date) => {
              const d = dateStr ? new Date(dateStr) : defaultDate;
              const year = d.getFullYear();
              const month = d.getMonth();
              const yearsDiff = year - cy;
              const monthsDiff = month - 3; // April is index 3
              const totalMonths = yearsDiff * 12 + monthsDiff;
              const dayFraction = (d.getDate() - 1) / 30;
              return Math.max(0, Math.min(12, totalMonths + dayFraction));
            };

            const getGridPosition = (fm: number) => {
              const integerPart = Math.floor(fm);
              const fractionPart = fm - integerPart;
              const boundaries = [0];
              let currentUnits = 0;
              const quartersList = ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q3', 'Q3', 'Q3', 'Q4', 'Q4', 'Q4'];
              for (let i = 0; i < 12; i++) {
                const qKey = quartersList[i];
                const isExpanded = expandedQuarters[qKey];
                if (isExpanded) {
                  currentUnits += 1;
                } else {
                  currentUnits += 1 / 3;
                }
                boundaries.push(currentUnits);
              }
              const totalUnits = boundaries[12];
              const idx = Math.min(11, integerPart);
              const startVal = boundaries[idx];
              const endVal = boundaries[idx + 1];
              const unitPos = startVal + (endVal - startVal) * fractionPart;
              return totalUnits > 0 ? (unitPos / totalUnits) * 100 : 0;
            };

            const visibleColumns: { id: string; type: 'quarter' | 'month'; label: string; quarter: string }[] = [];
            const quartersDef = [
              { key: 'Q1', label: 'Q1 (Apr-Jun)', months: ['Apr', 'May', 'Jun'] },
              { key: 'Q2', label: 'Q2 (Jul-Sep)', months: ['Jul', 'Aug', 'Sep'] },
              { key: 'Q3', label: 'Q3 (Oct-Dec)', months: ['Oct', 'Nov', 'Dec'] },
              { key: 'Q4', label: 'Q4 (Jan-Mar)', months: ['Jan', 'Feb', 'Mar'] },
            ];

            quartersDef.forEach(q => {
              const isExpanded = expandedQuarters[q.key];
              if (isExpanded) {
                q.months.forEach(m => {
                  visibleColumns.push({
                    id: `${q.key}-${m}`,
                    type: 'month',
                    label: m,
                    quarter: q.key
                  });
                });
              } else {
                visibleColumns.push({
                  id: q.key,
                  type: 'quarter',
                  label: `FY ${q.key}`,
                  quarter: q.key
                });
              }
            });

            const toggleQuarter = (qKey: string) => {
              setExpandedQuarters(prev => ({
                ...prev,
                [qKey]: !prev[qKey]
              }));
            };

            return (
              <div className="x-card overflow-x-auto p-5 animate-fade-in">
                <div className="min-w-[1000px]">
                  <div className="flex border-b border-[var(--color-x-border)] pb-3 mb-4 select-none">
                    <div className="w-80 flex-shrink-0 text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider flex items-center">
                      Project Timeline (FY {cy}-{String(cy + 1).slice(-2)})
                    </div>
                    <div className="flex-1 flex gap-0.5">
                      {visibleColumns.map(col => (
                        <div 
                          key={col.id} 
                          onClick={() => toggleQuarter(col.quarter)} 
                          className="flex-1 text-center py-1.5 px-1 rounded-md cursor-pointer hover:bg-indigo-50/50 transition-colors flex flex-col items-center justify-center border-l border-[var(--color-x-border)]/40 bg-[var(--color-x-bg)]"
                        >
                          {col.type === 'quarter' ? (
                            <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-extrabold uppercase tracking-wide">
                              {col.label} <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[var(--color-x-text)] flex flex-col leading-tight">
                              <span className="text-[8px] text-[var(--color-x-text-muted)] font-normal uppercase tracking-wider">{col.quarter}</span>
                              <span className="flex items-center gap-0.5 justify-center">
                                {col.label} <ChevronDown className="w-2.5 h-2.5 text-indigo-400" />
                              </span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {filtered.map(p => {
                      const sdFraction = getFiscalMonthFraction(p.startDate || undefined, new Date(cy, 3, 1));
                      const tdFraction = getFiscalMonthFraction(p.targetDate || undefined, new Date(cy + 1, 2, 31));
                      const leftPct = getGridPosition(sdFraction);
                      const rightPct = getGridPosition(tdFraction);
                      
                      const sp = Math.min(leftPct, rightPct);
                      const wp = Math.max(1, Math.abs(rightPct - leftPct));
                      const barColor = p.status === 'Completed' ? '#10b981' : p.status === 'Delayed' ? '#ef4444' : '#6366f1';
                      return (
                        <div key={`${p.id}-${p.department}-${p.owner}`} onClick={() => openRow(p)} className="flex items-center group cursor-pointer hover:bg-[var(--color-x-bg)] rounded-lg p-2 transition-colors">
                          <div className="w-80 flex-shrink-0 pr-5 truncate">
                            <p className="text-[13px] font-semibold text-[var(--color-x-text)] truncate group-hover:text-indigo-600 transition-colors">{p.name}</p>
                            <div className="text-[11px] text-[var(--color-x-text-muted)] flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>{p.owner}</span>
                              <span>·</span>
                              <DepartmentLabel department={p.department} subdivision={p.subdivision} variant="inline" />
                            </div>
                          </div>
                          <div className="flex-1 relative h-7 bg-[var(--color-x-bg)] rounded-md overflow-hidden border border-[var(--color-x-border)]">
                            <div className="absolute inset-0 flex">
                              {visibleColumns.map((_, i) => (
                                <div key={i} className="flex-1 border-l border-[var(--color-x-border)]/40" />
                              ))}
                            </div>
                            <div className="absolute top-1 bottom-1 rounded-md overflow-hidden shadow-sm transition-all group-hover:shadow-md"
                              style={{ left: `${sp}%`, width: `${wp}%`, background: barColor }}>
                              <div className="absolute top-0 bottom-0 left-0 bg-white/20" style={{ width: `${p.progress}%` }} />
                              <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white z-10">{p.progress}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filtered.length === 0 && <div className="text-center p-12 text-[var(--color-x-text-muted)]">No projects to show.</div>}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* Click-away for dropdown */}
      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      <ProjectModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditProject(null);
          setNewProjectDept(null);
          setNewProjectSub(null);
        }}
        editProject={editProject}
        defaultDepartment={newProjectDept || undefined}
        defaultSubdivision={newProjectSub || undefined}
      />

      {taskMirror && (
        <DependencyTaskModal
          parentId={taskMirror.parentId}
          depId={taskMirror.depId}
          onClose={() => setTaskMirror(null)}
        />
      )}
    </div>
  );
}
