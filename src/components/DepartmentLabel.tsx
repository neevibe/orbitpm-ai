'use client';

import { resolveHierarchy } from '@/lib/org-structure';

/**
 * Consistent "Department ↳ Subdivision" display used across the app
 * (projects list, detail, dashboard, search). Renders the subdivision as a
 * clear child of the department — not a disconnected tag.
 */
export default function DepartmentLabel({
  department,
  subdivision,
  variant = 'stacked',
  className = '',
}: {
  department: string | null | undefined;
  subdivision?: string | null;
  /** 'stacked' = two lines with ↳ ; 'inline' = "Dept ↳ Sub" on one line */
  variant?: 'stacked' | 'inline';
  className?: string;
}) {
  const h = resolveHierarchy(department, subdivision);

  if (variant === 'inline') {
    return (
      <span className={className}>
        {h.verticalDisplay}
        {h.subdivision && <span className="text-[var(--color-x-text-muted)]"> ↳ {h.subdivision}</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span>{h.verticalDisplay}</span>
      {h.subdivision && (
        <span className="text-[11px] text-[var(--color-x-text-muted)] flex items-center gap-0.5">
          <span className="text-[var(--color-x-text-muted)]">↳</span> {h.subdivision}
        </span>
      )}
    </span>
  );
}
