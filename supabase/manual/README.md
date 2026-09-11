# Manual-only SQL — never auto-applied

Files here are deliberately OUTSIDE `supabase/migrations/` so that the Supabase
GitHub integration can never pick them up. They change live data and require a
human decision and a sign-off before running.

| File | Why it is quarantined |
|------|----------------------|
| `0004_v2_hierarchy.sql` | Destructive. Renames "Digital & Data" → "Digital Experience", reassigns the CBB projects to BASL, and DELETEs the CBB department row. The app already renders the new hierarchy at the display layer (`src/lib/org-structure.ts`), so production data stays unchanged and reversible until someone chooses to run this. |

Run these by pasting them into the Supabase SQL editor, never by enabling an
automation that sweeps a directory.
