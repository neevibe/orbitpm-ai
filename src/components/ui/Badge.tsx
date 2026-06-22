import type { ReactNode } from 'react';

type BadgeColor = 'blue' | 'green' | 'red' | 'amber' | 'gray' | 'purple' | 'indigo';

export function Badge({ color = 'gray', children, className = '' }: {
  color?: BadgeColor;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`x-badge x-badge-${color} ${className}`}>{children}</span>;
}

// ── Single source of truth: project status → badge color ──
const STATUS_COLOR: Record<string, BadgeColor> = {
  'In Progress': 'blue',
  'Completed': 'green',
  'Delayed': 'red',
  'On Hold': 'amber',
  'Not Started': 'gray',
};

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  return <Badge color={STATUS_COLOR[status] ?? 'gray'} className={className}>{status}</Badge>;
}

// ── Single source of truth: priority → pill ──
export function PriorityBadge({ priority, className = '' }: { priority: string; className?: string }) {
  return <span className={`x-priority-${priority.toLowerCase()} ${className}`}>{priority}</span>;
}
