import type { CSSProperties } from 'react';

/**
 * Shared chart palette + primitives — "Trust & Authority" v3.
 *
 * One place for every Recharts fill/stroke so the whole app reads as one
 * analytical tool. Colors are desaturated (Tableau-style) on purpose:
 * charts should look measured, not neon. Never hardcode chart hex in pages.
 */

/** Project status → fill. Same mapping everywhere a status is drawn. */
export const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#94a3b8',
  'In Progress': '#4e79a7',
  'On Hold': '#e8a838',
  'Delayed': '#d1615d',
  'Completed': '#59a14f',
};

/** Portfolio health buckets. */
export const HEALTH_COLORS = {
  onTrack: '#59a14f',
  atRisk: '#e8a838',
  delayed: '#d1615d',
};

/** Priority → fill (progress bars, mixes). */
export const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#d1615d',
  High: '#e8823c',
  Medium: '#e8c144',
  Low: '#59a14f',
};

/** Categorical series rotation for multi-series charts. */
export const SERIES = ['#4e79a7', '#59a14f', '#d1615d', '#e8a838', '#76b7b2', '#64748b'];

/** Neutral track/remainder fill (e.g. "pending" segment of stacked bars). */
export const TRACK = '#e7ecf3';

/** Axis tick styling — 11px muted slate, consistent across all charts. */
export const AXIS_TICK = { fontSize: 11, fill: '#64748b' } as const;

/**
 * Tooltip: dark slate card — high contrast against white charts, reads as
 * "precision instrument" rather than default library output.
 */
export const TOOLTIP_STYLE: CSSProperties = {
  background: '#0f172a',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#f8fafc',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
  padding: '8px 12px',
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: '#cbd5e1',
  fontSize: '11px',
  fontWeight: 600,
  marginBottom: '2px',
};

export const TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: '#f8fafc',
};

/** Bar geometry: analytical, not bubbly. */
export const BAR = {
  size: 20,          // default bar thickness (px)
  sizeSlim: 12,      // stacked/horizontal breakdowns
  radius: [2, 2, 0, 0] as [number, number, number, number],
  radiusFlat: [0, 2, 2, 0] as [number, number, number, number], // horizontal bars
};
