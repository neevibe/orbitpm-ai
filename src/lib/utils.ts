import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BIAL_EMPLOYEES } from "./employee-data";

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
  'Duty Free': 'PRRETAIL',
  'CBB': 'PRAMEN',
  'BASL': 'PRBASL',
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

/**
 * Format a rupee amount with Indian grouping. e.g. 2500000 → "₹ 25,00,000".
 * Returns "—" when there is no value.
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return '₹ ' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Compact INR using lakh/crore. e.g. 2500000 → "₹ 25 L", 24000000 → "₹ 2.4 Cr".
 */
export function formatINRCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹ ${trimNum(amount / 1e7)} Cr`;
  if (abs >= 1e5) return `₹ ${trimNum(amount / 1e5)} L`;
  if (abs >= 1e3) return `₹ ${trimNum(amount / 1e3)} K`;
  return '₹ ' + Math.round(amount).toLocaleString('en-IN');
}

function trimNum(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/** Parse a user-typed rupee string ("25,00,000", "₹ 2.4 Cr", "1.5L") to a number. */
export function parseINR(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return Number.isNaN(input) ? null : input;
  let s = input.toString().trim().toLowerCase().replace(/₹|,|\s/g, '');
  let mult = 1;
  if (s.endsWith('cr')) { mult = 1e7; s = s.slice(0, -2); }
  else if (s.endsWith('l')) { mult = 1e5; s = s.slice(0, -1); }
  else if (s.endsWith('k')) { mult = 1e3; s = s.slice(0, -1); }
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n * mult;
}

/**
 * Does a project's free-text `owner` field refer to the given user?
 *
 * Owner strings come from the imported spreadsheet and are messy: several
 * names separated by "/" or ",", first names only ("Avishek"), or partial
 * names ("George Kuruvilla" for "George Bennet Kuruvilla"). Strict equality
 * against the user's full name locks real owners out of their own projects,
 * so each listed owner matches when all of its words appear in the user's
 * full name, or when it equals the user's email prefix.
 */
// First names shared by 2+ employees are ambiguous: a bare "Neeraj" owner row
// cannot be attributed to either Neeraj (reported: Neeraj Prakash saw Neeraj
// Manoria's Digital Experience projects under My Work). Built once from the
// org roster.
const AMBIGUOUS_FIRST_NAMES: Set<string> = (() => {
  const counts = new Map<string, number>();
  for (const e of BIAL_EMPLOYEES) {
    const first = e.name.trim().toLowerCase().split(/\s+/)[0];
    if (first) counts.set(first, (counts.get(first) || 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([f]) => f));
})();

/**
 * Canonical identity for a free-text owner string, resolved against the
 * employee roster (the "User list"). "Ilora" and "Ilora Ghosh Banerjee" are
 * the same person: grouping surfaces (Workforce, Team, owner filters) key on
 * this so variants merge, and the roster's full name is what gets displayed.
 * Rules:
 *   • exact roster name (any case)          → roster spelling
 *   • lone first name, unique in the org    → that person's full name
 *   • lone first name shared by 2+ people   → left as typed (ambiguous)
 *   • partial name matching exactly one     → that person's full name
 *   • compound strings ("A / B", "A & B")   → left as typed (several people)
 */
export function canonicalOwnerName(owner: string | null | undefined): string {
  const raw = (owner ?? '').trim();
  if (!raw) return '';
  if (/[/,&+]|\band\b/i.test(raw)) return raw;
  const lower = raw.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  const exact = BIAL_EMPLOYEES.find(e => e.name.trim().toLowerCase() === lower);
  if (exact) return exact.name;

  if (words.length === 1) {
    if (AMBIGUOUS_FIRST_NAMES.has(words[0])) return raw;
    const hit = BIAL_EMPLOYEES.find(e => e.name.trim().toLowerCase().split(/\s+/)[0] === words[0]);
    return hit ? hit.name : raw;
  }

  const matches = BIAL_EMPLOYEES.filter(e => {
    const ew = e.name.toLowerCase().split(/\s+/);
    return words.every(w => ew.includes(w));
  });
  return matches.length === 1 ? matches[0].name : raw;
}

export function isProjectOwner(
  owner: string | null | undefined,
  fullName: string | null | undefined,
  email?: string | null,
): boolean {
  if (!owner) return false;
  const nameWords = (fullName ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const emailPrefix = (email ?? '').toLowerCase().split('@')[0];

  return owner
    .toLowerCase()
    .split(/[/,&+]|\band\b/)
    .map(t => t.trim())
    .filter(Boolean)
    .some(token => {
      if (emailPrefix && token === emailPrefix) return true;
      if (nameWords.length === 0) return false;
      const tokenWords = token.split(/\s+/);
      if (tokenWords.length === 1) {
        // A lone first name only matches when it's THIS user's first name AND
        // no one else in the org shares it — otherwise the row is ambiguous
        // and belongs to nobody until an admin writes the full name.
        return tokenWords[0] === nameWords[0] && !AMBIGUOUS_FIRST_NAMES.has(tokenWords[0]);
      }
      return tokenWords.every(w => nameWords.includes(w));
    });
}

/**
 * A project may only be "Delayed" once its (original) Target Date has actually
 * passed. Allowed when there is no target date, or the target date is today or
 * in the past; disallowed while the target date is still in the future.
 *
 * The Revised Date deliberately does NOT enter this check — Delayed stays keyed
 * on the confirmed Target Date.
 */
export function canBeDelayed(targetDate?: string | null): boolean {
  const du = daysUntil(targetDate);
  return du === null || du <= 0;
}

/**
 * Enforce the Delayed rule on read/write: a "Delayed" status whose Target Date
 * is still in the future is shown/stored as "In Progress" instead. Applied to
 * live data, user edits, and the bundled seed so the register, database, audit,
 * and activity feed all agree that Delayed means "past its Target Date".
 */
export function normalizeProjectStatus<T extends { status: string; targetDate?: string | null }>(p: T): T {
  if (p.status !== 'Delayed') return p;
  return canBeDelayed(p.targetDate) ? p : { ...p, status: 'In Progress' };
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


/** "1 project" / "3 projects" — count with correctly pluralized noun. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Canonical lowercase department key — matches the server's normalizeDept so
 *  a claim of "Digital" compares equal to register rows under "Digital & Data". */
export function deptKey(d: string | null | undefined): string {
  if (!d) return '';
  const s = d.toLowerCase().trim();
  if (s.startsWith('digital')) return 'digital & data';
  if (s.startsWith('advertis')) return 'advertising & marketing';
  if (s.startsWith('duty') || s === 'dutyfree') return 'duty free';
  if (s.startsWith('commercial')) return 'commercial development';
  if (s.startsWith('oper')) return 'operations';
  if (s === 'basl' || s === 'cbb' || s === 'ccb' || s.startsWith('amen')) return 'basl';
  return s;
}
