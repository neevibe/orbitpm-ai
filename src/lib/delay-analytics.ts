import type { Project } from './mock-data';

/**
 * Delay analytics — month-over-month delay movement and the revenue impact of
 * those delays.
 *
 * ── Why this file is careful about history ──────────────────────────────────
 * The register stores only the CURRENT state of each project. There is no
 * status-history table, so "how many projects were delayed last month" cannot
 * be read back — it has to be RECONSTRUCTED from each project's Target Date.
 *
 * The reconstruction below is deterministic and uses ONE predicate on both
 * sides of the comparison, so the month-over-month delta is sound even though
 * each individual month's absolute count carries a known bias (see
 * `wasDelayedOn`). Treat the delta as the signal and the levels as estimates.
 */

/** Statuses the Delayed rule acts on — see normalizeProjectStatus in utils.ts. */
const DELIVERY_STATUSES = new Set(['In Progress', 'Delayed']);

const MS_PER_DAY = 86_400_000;

/** Local-midnight ISO day string ("2026-09-11") — matches how targetDate is stored. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Was this project delayed as of `asOf` (an ISO day string)?
 *
 * Base definition: a delivery-status project whose Target Date had already
 * passed on that date — exactly the live Delayed rule, evaluated at an
 * arbitrary date instead of today. Three cases need care:
 *
 *  1. FINISHED projects (`completedAt` set) were delayed only for the window
 *     between their Target Date and the day they closed. Handling this is what
 *     makes "recovered" a real number instead of a permanent zero.
 *
 *  2. LEGACY finished projects with no `completedAt` (everything closed before
 *     that stamp shipped) cannot be placed in time, so they are treated as
 *     never delayed. This under-counts past months, which makes a reported
 *     month-over-month INCREASE a floor, never an exaggeration.
 *
 *  3. Hand-flagged Delayed projects with NO Target Date have no date to place
 *     them at either. They are counted in every period, so they keep the
 *     current-month total equal to the dashboard's Delayed KPI while cancelling
 *     out of the month-over-month delta.
 */
export function wasDelayedOn(p: Project, asOf: string): boolean {
  if (p.archived) return false;
  if (p.completedAt) return !!p.targetDate && p.targetDate < asOf && p.completedAt >= asOf;
  if (!DELIVERY_STATUSES.has(p.status)) return false;
  if (!p.targetDate) return p.status === 'Delayed';
  return p.targetDate < asOf;
}

export function delayedAsOf(projects: Project[], asOf: string): Project[] {
  return projects.filter(p => wasDelayedOn(p, asOf));
}

/** How many days past its Target Date a project is, as of `asOf`. 0 if not past. */
export function daysDelayedAsOf(p: Project, asOf: string): number {
  if (!p.targetDate) return 0;
  const t = new Date(p.targetDate + 'T00:00:00').getTime();
  const a = new Date(asOf + 'T00:00:00').getTime();
  if (Number.isNaN(t) || Number.isNaN(a) || a <= t) return 0;
  return Math.floor((a - t) / MS_PER_DAY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Month-over-month comparison
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthPoint {
  /** "Aug '26" */
  label: string;
  /** ISO day the count was evaluated at (month end, or today for the current month). */
  asOf: string;
  /** True for the in-flight month — its count is month-to-date, not a closed figure. */
  partial: boolean;
  delayed: number;
  /** Delayed projects as a share of all delivery-status projects with a target date. */
  delayedPct: number;
  projects: Project[];
}

export interface MonthOverMonthDelays {
  previous: MonthPoint;
  current: MonthPoint;
  /** current.delayed − previous.delayed. */
  delta: number;
  /** Percentage change; null when the previous month was zero (undefined growth). */
  deltaPct: number | null;
  /** Projects delayed now that were not delayed at the previous month's close. */
  newlyDelayed: Project[];
  /** Projects delayed at the previous close that are no longer delayed. */
  recovered: Project[];
  /** Per-department previous-vs-current counts, busiest first. */
  byDepartment: { department: string; previous: number; current: number; delta: number }[];
  /** Longer context series ending with the current month. */
  series: MonthPoint[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function buildPoint(projects: Project[], ref: Date, asOfDate: Date, partial: boolean): MonthPoint {
  const asOf = isoDay(asOfDate);
  const delayedProjects = delayedAsOf(projects, asOf);
  // Denominator: delivery-status projects that had a target date by then —
  // i.e. the population the rule can actually flag. Projects with no target
  // date are excluded from BOTH sides so the percentage is meaningful.
  const measurable = projects.filter(p => !p.archived && (p.targetDate || p.status === 'Delayed') && DELIVERY_STATUSES.has(p.status)).length;
  return {
    label: monthLabel(ref),
    asOf,
    partial,
    delayed: delayedProjects.length,
    delayedPct: measurable ? Math.round((delayedProjects.length / measurable) * 1000) / 10 : 0,
    projects: delayedProjects,
  };
}

/**
 * Compare delayed-project counts at the close of last month against today.
 *
 * `today` is injectable so the result is testable and so server and client can
 * agree on a reference date.
 */
export function monthOverMonthDelays(projects: Project[], today: Date = new Date(), historyMonths = 6): MonthOverMonthDelays {
  const active = projects.filter(p => !p.archived);

  // Close of the previous month = first day of this month (exclusive upper
  // bound), so a target date of 31 Aug counts as delayed on the 1 Sep close.
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousRef = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const previous = buildPoint(active, previousRef, currentMonthStart, false);
  const current = buildPoint(active, today, today, true);

  const prevIds = new Set(previous.projects.map(p => p.id));
  const currIds = new Set(current.projects.map(p => p.id));

  const deptRows = new Map<string, { previous: number; current: number }>();
  const bump = (dept: string, key: 'previous' | 'current') => {
    const row = deptRows.get(dept) ?? { previous: 0, current: 0 };
    row[key] += 1;
    deptRows.set(dept, row);
  };
  previous.projects.forEach(p => bump(p.department || 'Unknown', 'previous'));
  current.projects.forEach(p => bump(p.department || 'Unknown', 'current'));

  const series: MonthPoint[] = [];
  for (let i = historyMonths - 1; i >= 1; i--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const close = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    series.push(buildPoint(active, ref, close, false));
  }
  series.push(current);

  return {
    previous,
    current,
    delta: current.delayed - previous.delayed,
    deltaPct: previous.delayed === 0
      ? null
      : Math.round(((current.delayed - previous.delayed) / previous.delayed) * 1000) / 10,
    newlyDelayed: current.projects.filter(p => !prevIds.has(p.id)),
    recovered: previous.projects.filter(p => !currIds.has(p.id)),
    byDepartment: Array.from(deptRows.entries())
      .map(([department, r]) => ({ department, ...r, delta: r.current - r.previous }))
      .sort((a, b) => b.current - a.current || b.previous - a.previous),
    series,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue impact of delay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-project revenue impact.
 *
 * Two components, kept SEPARATE on purpose because they are different kinds of
 * money and conflating them is how delay costs get double-counted:
 *
 *  1. `revenueDeferred` — revenue the project was expected to generate that has
 *     not been generated because it has not shipped. Straight-line accrual:
 *         (expectedAnnualRevenue / 365) × daysDelayed
 *     This is a TIMING loss for recurring revenue (it shifts right) and a TRUE
 *     loss for time-boxed revenue (a season, a contract window) — which side
 *     applies is a business call, so the UI labels it "deferred", not "lost".
 *
 *  2. `carryingCost` — money actually burned while the project ran late,
 *     derived from the project's own observed burn rate:
 *         (utilizedBudget / daysElapsedSinceStart) × daysDelayed
 *     No assumed overhead rate is invented; if a project has not recorded spend
 *     or a start date, this is null rather than guessed.
 *
 * A project with neither input is `quantified: false` and contributes NOTHING to
 * the totals. It is counted and named instead, so the gap is visible rather
 * than silently rounded to zero.
 */
export interface ProjectRevenueImpact {
  project: Project;
  daysDelayed: number;
  /** Straight-line deferred revenue (₹), or null when expectedAnnualRevenue is unset. */
  revenueDeferred: number | null;
  /** Observed burn × days late (₹), or null when spend/start date are unset. */
  carryingCost: number | null;
  /** revenueDeferred + carryingCost, treating nulls as absent (not zero). */
  totalImpact: number;
  /** False when no input was available — excluded from totals, listed as a gap. */
  quantified: boolean;
  /** Which inputs were missing, for the "to quantify this, fill in X" prompt. */
  missingInputs: string[];
}

export interface DelayRevenueImpact {
  perProject: ProjectRevenueImpact[];
  /** Delayed projects with at least one usable financial input. */
  quantified: ProjectRevenueImpact[];
  /** Delayed projects with no financial inputs at all. */
  unquantified: ProjectRevenueImpact[];
  totalRevenueDeferred: number;
  totalCarryingCost: number;
  totalImpact: number;
  /** quantified / total delayed, as a percentage — the trust score for the number above. */
  coveragePct: number;
}

function daysBetween(fromISO: string, toISO: string): number | null {
  const a = new Date(fromISO + 'T00:00:00').getTime();
  const b = new Date(toISO + 'T00:00:00').getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / MS_PER_DAY);
}

export function projectRevenueImpact(p: Project, today: Date = new Date()): ProjectRevenueImpact {
  const asOf = isoDay(today);
  const daysDelayed = daysDelayedAsOf(p, asOf);
  const missingInputs: string[] = [];

  const annual = p.expectedAnnualRevenue ?? null;
  let revenueDeferred: number | null = null;
  if (annual != null && annual > 0) {
    revenueDeferred = Math.round((annual / 365) * daysDelayed);
  } else {
    missingInputs.push('Expected Annual Revenue');
  }

  let carryingCost: number | null = null;
  const spent = p.utilizedBudget ?? null;
  if (spent != null && spent > 0 && p.startDate) {
    const elapsed = daysBetween(p.startDate, asOf);
    if (elapsed != null && elapsed > 0) {
      carryingCost = Math.round((spent / elapsed) * daysDelayed);
    }
  }
  if (carryingCost == null) {
    missingInputs.push(p.startDate ? 'Utilized Budget' : 'Start Date + Utilized Budget');
  }

  const totalImpact = (revenueDeferred ?? 0) + (carryingCost ?? 0);
  return {
    project: p,
    daysDelayed,
    revenueDeferred,
    carryingCost,
    totalImpact,
    quantified: revenueDeferred != null || carryingCost != null,
    missingInputs,
  };
}

/** Roll the per-project impact up across every currently delayed project. */
export function delayRevenueImpact(projects: Project[], today: Date = new Date()): DelayRevenueImpact {
  const delayed = delayedAsOf(projects, isoDay(today));
  const perProject = delayed
    .map(p => projectRevenueImpact(p, today))
    .sort((a, b) => b.totalImpact - a.totalImpact || b.daysDelayed - a.daysDelayed);

  const quantified = perProject.filter(r => r.quantified);
  const unquantified = perProject.filter(r => !r.quantified);

  return {
    perProject,
    quantified,
    unquantified,
    totalRevenueDeferred: quantified.reduce((a, r) => a + (r.revenueDeferred ?? 0), 0),
    totalCarryingCost: quantified.reduce((a, r) => a + (r.carryingCost ?? 0), 0),
    totalImpact: quantified.reduce((a, r) => a + r.totalImpact, 0),
    coveragePct: perProject.length ? Math.round((quantified.length / perProject.length) * 1000) / 10 : 0,
  };
}
