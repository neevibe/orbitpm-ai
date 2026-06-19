// ============================================================
// Xyrenis organisational structure (v2: Department → Subdivision)
// ============================================================
//
// The Supabase `departments` table currently stores these vertical names:
//   Advertising & Marketing, BASL, CBB, Commercial Development,
//   Digital & Data, Duty Free, Operations
//
// v2 hierarchy changes are expressed HERE as a config/display layer so the
// preview build renders the new structure WITHOUT mutating shared production
// data. The destructive DB migration (rename dept row, move CBB projects) is
// written separately and only run at production rollout after sign-off.
//
//   • "Digital & Data"  → displayed as "Digital Experience"
//   • "CBB"             → folded under BASL as a subdivision (no longer a vertical)
//   • "Operations"      → subdivisions: F&B, Retail, Landside Commercial
//   • "BASL"            → subdivisions: CBB, 080 Lounge & Hotels

/**
 * Subdivisions (sub-departments) available under each vertical.
 * Keyed by the STORED department name (e.g. 'Digital & Data', displayed as
 * 'Digital Experience').
 */
export const SUBDIVISIONS: Record<string, string[]> = {
  Operations: [
    'Business Analytics & Contract Management',
    'F&B',
    'Retail',
    'Landside Commercial',
  ],
  'Advertising & Marketing': [
    'Advertising',
    'Content Management',
    'Social Media',
    'Commercial Marketing',
    'Digital Marketing',
  ],
  'Digital & Data': [
    'Brand Management',
    'Digital Product',
    'Digital Strategy',
    'Omnichannel',
    'Rewards & Payment',
  ],
  BASL: [
    '080 Lounges & Hotels',
    'Care by BLR (CBB)',
    'Gate Z',
    'Ovetra',
    'Ovaya',
  ],
};

/** Verticals whose UI label differs from the stored department name. */
export const DEPARTMENT_DISPLAY: Record<string, string> = {
  'Digital & Data': 'Digital Experience',
  'Advertising & Marketing': 'Advertisement',
};

/**
 * Departments that have been folded into a parent vertical as a subdivision.
 * A project still stored with department === key is shown under `parent` →
 * `subdivision` until the data migration runs.
 */
export const FOLDED_INTO: Record<string, { parent: string; subdivision: string }> = {
  CBB: { parent: 'BASL', subdivision: 'Care by BLR (CBB)' },
};

/** Canonical top-level verticals, in display order (CBB folded into BASL). */
export const TOP_LEVEL_DEPARTMENTS = [
  'Operations',
  'Commercial Development',
  'Digital & Data',
  'Advertising & Marketing',
  'Duty Free',
  'BASL',
];

/** UI label for a stored department name. */
export function departmentDisplayName(dept: string | null | undefined): string {
  if (!dept) return '';
  return DEPARTMENT_DISPLAY[dept] || dept;
}

/** Subdivisions for a vertical (empty array if none). */
export function getSubdivisions(dept: string | null | undefined): string[] {
  if (!dept) return [];
  return SUBDIVISIONS[dept] || [];
}

/** Whether a vertical requires a subdivision selection. */
export function hasSubdivisions(dept: string | null | undefined): boolean {
  return getSubdivisions(dept).length > 0;
}

export interface ResolvedHierarchy {
  /** The stored vertical the project belongs to after folding (e.g. CBB→BASL). */
  vertical: string;
  /** Display label for that vertical (e.g. Digital & Data→Digital Experience). */
  verticalDisplay: string;
  /** The subdivision, if any. */
  subdivision: string | null;
}

/**
 * Resolve a project's effective vertical + subdivision from its stored
 * department and optional subdivision field. Handles folded departments (CBB)
 * so legacy rows display correctly before the migration runs.
 */
export function resolveHierarchy(
  rawDept: string | null | undefined,
  subdivision?: string | null,
): ResolvedHierarchy {
  const dept = rawDept || '';
  const folded = FOLDED_INTO[dept];
  if (folded) {
    return {
      vertical: folded.parent,
      verticalDisplay: departmentDisplayName(folded.parent),
      subdivision: subdivision || folded.subdivision,
    };
  }
  return {
    vertical: dept,
    verticalDisplay: departmentDisplayName(dept),
    subdivision: subdivision || null,
  };
}

// ============================================================
// Dependency classification (v2: internal / external)
// ============================================================

/** Internal BIAL functions used when a dependency is "Within BIAL". */
export const BIAL_INTERNAL_DEPARTMENTS = [
  'Finance',
  'ICT',
  'HR',
  'Operations',
  'Projects',
  'Marketing',
];

/** Suggested categories for an "Outside BIAL" external dependency (free text). */
export const OUTSIDE_BIAL_SUGGESTIONS = [
  'Vendor',
  'Government Agency',
  'Consultant',
  'Airline Partner',
];
