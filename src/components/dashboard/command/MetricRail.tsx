'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export interface Metric {
  label: string;
  value: string | number;
  /** Supporting line. Must be derived from real data — never a fabricated delta. */
  note?: string;
  tone?: 'up' | 'down' | 'warn' | 'flat';
  onSelect?: () => void;
  selected?: boolean;
}

/**
 * The portfolio metric rail.
 *
 * Six identically-weighted KPI cards give the reader no idea which number
 * matters, so they read none of them. Here the first metric is the lead figure
 * at display size and the rest are a quiet row divided by hairlines — one
 * object, one hierarchy, no six competing borders and no six colored icon
 * chips. Trends render only when there is a real figure behind them.
 */
function Cell({ m, lead: isLead }: { m: Metric; lead?: boolean }) {
  const tone =
    m.tone === 'up' ? 'var(--color-x-success)'
    : m.tone === 'down' ? 'var(--color-x-danger)'
    : m.tone === 'warn' ? 'var(--color-x-warning)'
    : 'var(--color-x-text-muted)';
  const content = (
    <>
      <span className="x-rail-label">{m.label}</span>
      <span className="x-rail-value">{m.value}</span>
      {m.note && (
        <span className="x-rail-note inline-flex items-center gap-1" style={{ color: tone }}>
          {m.tone === 'up' && <ArrowUpRight className="w-3 h-3" aria-hidden="true" />}
          {m.tone === 'down' && <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
          {m.note}
        </span>
      )}
    </>
  );
  const cls = `x-rail-item ${isLead ? 'x-rail-lead' : ''}`;
  return m.onSelect
    ? <button type="button" onClick={m.onSelect} aria-pressed={!!m.selected} className={cls}>{content}</button>
    : <div className={cls}>{content}</div>;
}

export default function MetricRail({ metrics }: { metrics: Metric[] }) {
  const [lead, ...rest] = metrics;
  if (!lead) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch gap-5 sm:gap-0">
      <div className="sm:pr-8 sm:border-r border-[var(--color-x-border)] flex-none">
        <Cell m={lead} lead />
      </div>
      <div className="x-rail grid-cols-2 md:grid-cols-5 flex-1 sm:pl-2 min-w-0">
        {rest.map(m => <Cell key={m.label} m={m} />)}
      </div>
    </div>
  );
}
