import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return date;
  }
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'In Progress': 'in-progress',
    'Completed': 'completed',
    'Delayed': 'delayed',
    'Not Started': 'not-started',
    'On Hold': 'on-hold',
  };
  return map[status] || 'not-started';
}

export function getPriorityColor(priority: string): string {
  return priority.toLowerCase();
}

// Department → Project ID prefix mapping
const DEPT_PREFIX_MAP: Record<string, string> = {
  'Digital & Data': 'PRDIGI',
  'Operations': 'PROPS',
  'Commercial Development': 'PRCOMDEV',
  'Advertising & Marketing': 'PRADMKT',
  'Retail & Commerce': 'PRRETAIL',
  'CBB': 'PRAMEN',
  'Strategic Support': 'PRSTRAT',
};

export function getDeptPrefix(department: string): string {
  if (DEPT_PREFIX_MAP[department]) return DEPT_PREFIX_MAP[department];
  // Auto-generate prefix from dept name for unknown departments
  const clean = department.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return 'PR' + clean.substring(0, 5);
}

export function generateProjectId(department: string, existingIds: string[]): string {
  const prefix = getDeptPrefix(department);
  // Find the highest sequence number for this prefix
  const nums = existingIds
    .filter(id => id.startsWith(prefix + '_') || id.startsWith(prefix))
    .map(id => {
      const match = id.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
  const next = maxNum + 1;
  return `${prefix}_${next}`;
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.ceil((targetStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  } catch {
    return null;
  }
}

