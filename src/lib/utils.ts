import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
