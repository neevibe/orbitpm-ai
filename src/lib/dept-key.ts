/**
 * Department canonicalisation — the SINGLE source of truth.
 *
 * Department names reach the app from three places that spell them differently:
 *   - auth claims, written by the admin UI, use short names ...... "Digital"
 *   - project rows, imported from the workbook, use long names ... "Digital & Data"
 *   - the org hierarchy folds some verticals together ............ CBB → BASL
 *
 * This rule used to be copy-pasted three times (deptKey in utils, normalizeDept
 * in api-auth, normalizeDeptName in data-context). The copies drifted in how
 * they were APPLIED — the server scoped rows through its copy while the client
 * permission check compared raw strings — so the API served a user their own
 * department's projects and the UI then refused every edit to them. One module,
 * imported everywhere, is what stops that recurring.
 *
 * Deliberately dependency-free so it can be unit-tested without booting the app.
 */

/** Canonical lowercase key for comparison. "Digital" and "Digital & Data" → "digital & data". */
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

/** True when two department spellings refer to the same department. */
export function sameDept(a: string | null | undefined, b: string | null | undefined): boolean {
  return deptKey(a) === deptKey(b);
}

/** Canonical DISPLAY name for the same set of rules. Unknown values pass through. */
export function deptDisplayName(d: string | null | undefined): string {
  if (!d) return '';
  switch (deptKey(d)) {
    case 'digital & data': return 'Digital & Data';
    case 'advertising & marketing': return 'Advertising & Marketing';
    case 'duty free': return 'Duty Free';
    case 'commercial development': return 'Commercial Development';
    case 'operations': return 'Operations';
    case 'basl': return 'BASL';
    default: return d;
  }
}
