'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/* ============================================================
   Types
   ============================================================ */
export type Domain = 'runway' | 'retail' | 'dutyfree' | 'operations';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'delayed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  domain: Domain;
  title: string;
  status: TaskStatus;
  assignee: string;
  priority: Priority;
  progress: number;      // 0-100
  dueDate: string;       // ISO yyyy-mm-dd
  startDay: number;      // gantt: day index 0-13
  endDay: number;        // gantt: day index 0-13
}

export interface Milestone {
  id: string;
  domain: Domain;
  title: string;
  day: number;           // gantt day index
  reached: boolean;
}

export interface Issue {
  id: string;
  domain: Domain;
  title: string;
  severity: 'low' | 'medium' | 'high';
  open: boolean;
}

export interface DomainMeta {
  key: Domain;
  label: string;
  short: string;
  color: string;         // hex accent
  soft: string;          // soft tint background
  trend: number[];       // sparkline data
}

export type DomainHealth = 'healthy' | 'progress' | 'delayed';

interface AppContextValue {
  tasks: Task[];
  milestones: Milestone[];
  issues: Issue[];
  domains: DomainMeta[];
  activeDomain: Domain | null;
  setActiveDomain: (d: Domain | null) => void;
  toggleDomain: (d: Domain) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  getDomainHealth: (d: Domain) => DomainHealth;
  getDomainScore: (d: Domain) => number;
  getOpenTaskCount: (d: Domain) => number;
}

/* ============================================================
   Domain metadata (spec colors)
   ============================================================ */
export const DOMAINS: DomainMeta[] = [
  { key: 'runway',     label: 'Aeroplanes / Runway', short: 'Runway',     color: '#6366f1', soft: '#eef0ff', trend: [62, 65, 60, 70, 74, 72, 80] },
  { key: 'retail',     label: 'Retail',              short: 'Retail',     color: '#10b981', soft: '#e9faf3', trend: [40, 48, 52, 50, 58, 66, 71] },
  { key: 'dutyfree',   label: 'Duty-Free',           short: 'Duty-Free',  color: '#f59e0b', soft: '#fef6e7', trend: [55, 53, 60, 58, 64, 62, 68] },
  { key: 'operations', label: 'Ground Operations',   short: 'Operations', color: '#8b5cf6', soft: '#f3eefe', trend: [70, 72, 68, 75, 73, 78, 82] },
];

/* ============================================================
   Seed data — real-world airport ops mock data
   ============================================================ */
const SEED_TASKS: Task[] = [
  { id: 'RWY-01', domain: 'runway', title: 'Flight EK203 Baggage Loading', status: 'in_progress', assignee: 'A. Rao', priority: 'critical', progress: 65, dueDate: '2026-06-15', startDay: 0, endDay: 2 },
  { id: 'RWY-02', domain: 'runway', title: 'Runway 09L De-icing Sweep', status: 'done', assignee: 'M. Javeed', priority: 'high', progress: 100, dueDate: '2026-06-14', startDay: 0, endDay: 1 },
  { id: 'RWY-03', domain: 'runway', title: 'Gate A12 Pushback Scheduling', status: 'in_progress', assignee: 'S. Nayak', priority: 'high', progress: 40, dueDate: '2026-06-16', startDay: 2, endDay: 5 },
  { id: 'RWY-04', domain: 'runway', title: 'Ground Radar Calibration', status: 'todo', assignee: 'K. Roy', priority: 'medium', progress: 0, dueDate: '2026-06-19', startDay: 5, endDay: 9 },
  { id: 'RWY-05', domain: 'runway', title: 'Apron Lighting Inspection', status: 'delayed', assignee: 'V. Kumar', priority: 'high', progress: 30, dueDate: '2026-06-13', startDay: 1, endDay: 4 },

  { id: 'RET-01', domain: 'retail', title: 'Terminal 1 Concession Rollout', status: 'in_progress', assignee: 'D. Gupta', priority: 'high', progress: 55, dueDate: '2026-06-18', startDay: 1, endDay: 6 },
  { id: 'RET-02', domain: 'retail', title: 'POS System Upgrade — Food Court', status: 'done', assignee: 'A. Bakshi', priority: 'medium', progress: 100, dueDate: '2026-06-12', startDay: 0, endDay: 3 },
  { id: 'RET-03', domain: 'retail', title: 'Lounge F&B Vendor Onboarding', status: 'todo', assignee: 'I. Banerjee', priority: 'medium', progress: 0, dueDate: '2026-06-22', startDay: 6, endDay: 11 },
  { id: 'RET-04', domain: 'retail', title: 'Retail Footfall Analytics Dashboard', status: 'in_progress', assignee: 'Sharath S', priority: 'low', progress: 35, dueDate: '2026-06-20', startDay: 3, endDay: 8 },

  { id: 'DTF-01', domain: 'dutyfree', title: 'Terminal 2 Duty-Free Inventory Re-stock', status: 'in_progress', assignee: 'N. Lewis', priority: 'critical', progress: 70, dueDate: '2026-06-15', startDay: 0, endDay: 3 },
  { id: 'DTF-02', domain: 'dutyfree', title: 'Liquor & Tobacco Compliance Audit', status: 'delayed', assignee: 'P. Poria', priority: 'high', progress: 45, dueDate: '2026-06-13', startDay: 1, endDay: 5 },
  { id: 'DTF-03', domain: 'dutyfree', title: 'Perfume Counter Visual Refresh', status: 'done', assignee: 'Vaishakh T', priority: 'low', progress: 100, dueDate: '2026-06-11', startDay: 0, endDay: 2 },
  { id: 'DTF-04', domain: 'dutyfree', title: 'Pre-order Pickup Kiosk Pilot', status: 'todo', assignee: 'R. N', priority: 'medium', progress: 0, dueDate: '2026-06-23', startDay: 7, endDay: 12 },

  { id: 'OPS-01', domain: 'operations', title: 'Terminal HVAC Predictive Maintenance', status: 'in_progress', assignee: 'A. Jangale', priority: 'high', progress: 60, dueDate: '2026-06-17', startDay: 2, endDay: 7 },
  { id: 'OPS-02', domain: 'operations', title: 'Security Lane Throughput Optimization', status: 'in_progress', assignee: 'R. Choudhury', priority: 'critical', progress: 50, dueDate: '2026-06-16', startDay: 1, endDay: 6 },
  { id: 'OPS-03', domain: 'operations', title: 'Shuttle Fleet GPS Integration', status: 'done', assignee: 'V. Mohan', priority: 'medium', progress: 100, dueDate: '2026-06-12', startDay: 0, endDay: 4 },
  { id: 'OPS-04', domain: 'operations', title: 'Waste Management Route Redesign', status: 'todo', assignee: 'Y. Mahajan', priority: 'low', progress: 0, dueDate: '2026-06-24', startDay: 8, endDay: 13 },
  { id: 'OPS-05', domain: 'operations', title: 'Emergency Drill Coordination', status: 'in_progress', assignee: 'S. Sidhu', priority: 'high', progress: 25, dueDate: '2026-06-19', startDay: 4, endDay: 9 },
];

const SEED_MILESTONES: Milestone[] = [
  { id: 'M1', domain: 'runway', title: 'Summer Schedule Live', day: 2, reached: true },
  { id: 'M2', domain: 'dutyfree', title: 'Q2 Inventory Closed', day: 5, reached: false },
  { id: 'M3', domain: 'retail', title: 'New Concessions Open', day: 8, reached: false },
  { id: 'M4', domain: 'operations', title: 'Safety Audit Sign-off', day: 11, reached: false },
];

const SEED_ISSUES: Issue[] = [
  { id: 'I1', domain: 'runway', title: 'Apron light fixture #7 flickering', severity: 'medium', open: true },
  { id: 'I2', domain: 'dutyfree', title: 'Compliance audit awaiting customs sign-off', severity: 'high', open: true },
  { id: 'I3', domain: 'operations', title: 'Security lane 4 scanner intermittent', severity: 'high', open: true },
  { id: 'I4', domain: 'retail', title: 'Footfall sensor calibration drift', severity: 'low', open: true },
];

/* ============================================================
   Context
   ============================================================ */
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [milestones] = useState<Milestone[]>(SEED_MILESTONES);
  const [issues] = useState<Issue[]>(SEED_ISSUES);
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);

  const toggleDomain = useCallback((d: Domain) => {
    setActiveDomain(prev => (prev === d ? null : d));
  }, []);

  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status, progress: status === 'done' ? 100 : t.progress } : t)));
  }, []);

  const getDomainHealth = useCallback((d: Domain): DomainHealth => {
    const dt = tasks.filter(t => t.domain === d);
    if (dt.some(t => t.status === 'delayed')) return 'delayed';
    if (dt.length > 0 && dt.every(t => t.status === 'done')) return 'healthy';
    return 'progress';
  }, [tasks]);

  const getDomainScore = useCallback((d: Domain): number => {
    const dt = tasks.filter(t => t.domain === d);
    if (!dt.length) return 0;
    const avg = dt.reduce((s, t) => s + t.progress, 0) / dt.length;
    const penalty = dt.filter(t => t.status === 'delayed').length * 8;
    return Math.max(0, Math.min(100, Math.round(avg - penalty)));
  }, [tasks]);

  const getOpenTaskCount = useCallback((d: Domain): number => {
    return tasks.filter(t => t.domain === d && t.status !== 'done').length;
  }, [tasks]);

  const value = useMemo<AppContextValue>(() => ({
    tasks, milestones, issues, domains: DOMAINS,
    activeDomain, setActiveDomain, toggleDomain,
    updateTaskStatus, getDomainHealth, getDomainScore, getOpenTaskCount,
  }), [tasks, milestones, issues, activeDomain, toggleDomain, updateTaskStatus, getDomainHealth, getDomainScore, getOpenTaskCount]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

/* Shared visual helpers */
export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  todo:        { label: 'To Do',       color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  done:        { label: 'Done',        color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  delayed:     { label: 'Delayed',     color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#64748b', bg: '#f1f5f9' },
  medium:   { label: 'Medium',   color: '#0891b2', bg: '#ecfeff' },
  high:     { label: 'High',     color: '#d97706', bg: '#fffbeb' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
};

export const HEALTH_COLOR: Record<DomainHealth, string> = {
  healthy: '#10b981',
  progress: '#f59e0b',
  delayed: '#ef4444',
};
