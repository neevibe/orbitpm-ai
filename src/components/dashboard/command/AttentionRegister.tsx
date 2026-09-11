'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { Project } from '@/lib/mock-data';
import { formatDate, plural } from '@/lib/utils';
import DepartmentLabel from '@/components/DepartmentLabel';

type Band = 'all' | 'delayed' | 'at-risk' | 'stalled';

export interface AttentionRow {
  project: Project;
  /** Days past the target date. 0 when not overdue. */
  daysLate: number;
  /** Open high-impact risks attached to this project. */
  risks: number;
  band: Exclude<Band, 'all'>;
}

const BANDS: { key: Band; label: string; help: string }[] = [
  { key: 'all',      label: 'Everything',  help: 'Every project needing attention' },
  { key: 'delayed',  label: 'Delayed',     help: 'Past its target date' },
  { key: 'at-risk',  label: 'At risk',     help: 'Open high-impact risk, not yet late' },
  { key: 'stalled',  label: 'Stalled',     help: 'In progress at 0% for the whole run' },
];

/**
 * The attention register — the page's primary working surface.
 *
 * The old dashboard buried delay in a five-row "Stuck Projects" card in a side
 * rail, below three charts. Delay is the thing this product exists to surface,
 * so it gets the widest band on the page and the most rows.
 *
 * Severity is encoded three ways deliberately — stripe opacity, the written
 * number of days, and sort order — so it survives colour blindness, greyscale
 * printing (this page is exported to PDF) and a quick skim.
 */
export default function AttentionRegister({
  rows,
  onOpen,
  emptyHint,
  renderOwner,
  rowAction,
  maxRows,
  onViewAll,
}: {
  rows: AttentionRow[];
  onOpen: (p: Project) => void;
  emptyHint?: string;
  /** Owner cell override — used to keep live Teams presence on the avatar. */
  renderOwner?: (p: Project) => ReactNode;
  /** Row-level action, revealed on hover/focus (progressive disclosure). */
  rowAction?: (p: Project) => ReactNode;
  /** Cap the visible rows so the widget keeps a predictable height in the grid. */
  maxRows?: number;
  onViewAll?: () => void;
}) {
  const [band, setBand] = useState<Band>('all');

  const counts = useMemo(() => ({
    all: rows.length,
    delayed: rows.filter(r => r.band === 'delayed').length,
    'at-risk': rows.filter(r => r.band === 'at-risk').length,
    stalled: rows.filter(r => r.band === 'stalled').length,
  }), [rows]);

  const matching = useMemo(
    () => (band === 'all' ? rows : rows.filter(r => r.band === band)),
    [rows, band],
  );
  const shown = maxRows ? matching.slice(0, maxRows) : matching;
  const hidden = matching.length - shown.length;

  const severity = (d: number) => (d >= 90 ? '' : d >= 30 ? ' sev-2' : ' sev-3');

  return (
    <div>
      <div role="tablist" aria-label="Attention filter" className="flex flex-wrap gap-1 mb-4">
        {BANDS.map(b => (
          <button
            key={b.key}
            role="tab"
            aria-selected={band === b.key}
            title={b.help}
            onClick={() => setBand(b.key)}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              band === b.key
                ? 'bg-[var(--color-x-text)] text-[var(--color-x-surface)]'
                : 'text-[var(--color-x-text-secondary)] hover:bg-[var(--color-x-bg)]'
            }`}
          >
            {b.label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[b.key]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[14px] font-semibold text-[var(--color-x-text)]">Nothing in this band</p>
          <p className="text-[12.5px] text-[var(--color-x-text-muted)] mt-1">
            {emptyHint ?? 'No project currently matches these conditions.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="x-attn min-w-[760px]">
            <thead>
              <tr>
                <th style={{ width: 28 }}><span className="sr-only">Severity</span></th>
                <th>Project</th>
                <th>Owner</th>
                <th>Department</th>
                <th className="num">Target</th>
                <th className="num">Days late</th>
                <th className="num">Progress</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr
                  key={r.project.id}
                  data-project-code={r.project.id}
                  onClick={() => onOpen(r.project)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r.project); } }}
                  className="group"
                >
                  <td>
                    {r.daysLate > 0
                      ? <span className={`x-sev${severity(r.daysLate)}`} aria-hidden="true" />
                      : <span className="x-sev sev-3" style={{ background: 'var(--color-x-warning)' }} aria-hidden="true" />}
                  </td>
                  <td className="min-w-0">
                    <div className="text-[var(--color-x-text)] font-medium truncate max-w-[280px]">
                      {r.project.name.replace(/\s+/g, ' ').trim()}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--color-x-text-muted)] mt-0.5">{r.project.id}</div>
                  </td>
                  <td className="text-[var(--color-x-text-secondary)] max-w-[170px]">
                    {renderOwner ? renderOwner(r.project) : <span className="truncate block">{r.project.owner || '—'}</span>}
                  </td>
                  <td><DepartmentLabel department={r.project.department} subdivision={r.project.subdivision} /></td>
                  <td className="num font-mono text-[11.5px] text-[var(--color-x-text-muted)]">{formatDate(r.project.targetDate)}</td>
                  <td className="num">
                    {r.daysLate > 0 ? (
                      <span className="font-semibold text-[var(--color-x-danger)]">{r.daysLate}d</span>
                    ) : r.risks > 0 ? (
                      <span className="text-[12px] text-[var(--color-x-warning)]">{plural(r.risks, 'risk')}</span>
                    ) : (
                      <span className="text-[12px] text-[var(--color-x-text-muted)]">stalled</span>
                    )}
                  </td>
                  <td className="num">
                    <span className="inline-flex items-center gap-2 justify-end">
                      <span className="x-microbar" aria-hidden="true">
                        <i style={{ width: `${Math.min(Math.max(r.project.progress ?? 0, 0), 100)}%` }} />
                      </span>
                      <span className="text-[12px] text-[var(--color-x-text-secondary)] w-8 text-right">{r.project.progress ?? 0}%</span>
                      {rowAction && (
                        <span
                          className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          {rowAction(r.project)}
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 text-[12px] font-semibold text-[var(--color-x-accent)] hover:underline cursor-pointer"
        >
          View all {matching.length} &rarr;
        </button>
      )}
    </div>
  );
}
