'use client';

import { OwnerAvatar } from '@/components/collab/TeamsCollab';

export interface TeamRow {
  name: string;
  active: number;
  delayed: number;
  presence?: { status: string; label: string };
}

/**
 * Team load — the "who is carrying what" widget.
 *
 * Ranked by active workload with the delayed count called out, so an overloaded
 * owner is visible before they become an escalation. The bar is proportional to
 * the busiest person in view, not to an arbitrary cap, so the comparison is
 * always meaningful at whatever scale the filter produces.
 */
export default function TeamStatus({ rows, onSelect }: { rows: TeamRow[]; onSelect?: (name: string) => void }) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-[var(--color-x-text-muted)] py-6 text-center">No active owners in this view.</p>;
  }
  const max = Math.max(...rows.map(r => r.active), 1);

  return (
    <ul className="flex flex-col">
      {rows.map((r, i) => (
        <li key={r.name} className={i === 0 ? '' : 'border-t border-[var(--color-x-border)]'}>
          <button
            type="button"
            onClick={() => onSelect?.(r.name)}
            className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[var(--color-x-bg)] px-2 -mx-2 rounded-md transition-colors cursor-pointer"
          >
            <OwnerAvatar name={r.name} presence={r.presence} />
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] text-[var(--color-x-text)] truncate">{r.name || 'Unassigned'}</span>
              <span className="x-loadbar mt-1" aria-hidden="true">
                <i style={{ width: `${(r.active / max) * 100}%` }} />
              </span>
            </span>
            <span className="flex-none text-right">
              <span className="block text-[13px] font-semibold text-[var(--color-x-text)] tabular-nums">{r.active}</span>
              {r.delayed > 0 && (
                <span className="block text-[11px] font-medium text-[var(--color-x-danger)] tabular-nums">{r.delayed} late</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
