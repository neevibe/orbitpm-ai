# Migrations — current state and how to apply them

## Apply them by hand. The GitHub integration is NOT safe to switch on yet.

Supabase's GitHub integration is connected to this repo with **Deploy to
production = ON** and production branch `main`, but its **Working directory** is
set to `supabase/migrations/`. That field wants the directory *containing* the
`supabase/` folder — which here is the repository root, i.e. blank. As
configured it resolves to `supabase/migrations/supabase/migrations/`, which does
not exist, so **no migration in this folder has ever been applied automatically.**

That misconfiguration is currently the only thing keeping the integration safe.
Two problems have to be fixed before the path is corrected:

1. **Filenames are not in Supabase CLI format.** It expects
   `YYYYMMDDHHMMSS_name.sql`. These are `0002_`, `0013_`, `001_` — and
   `001_initial_schema.sql` sorts *after* `0013_` lexically, so the initial
   schema would be applied last, against tables that already exist.

2. **The live schema is not what `001_initial_schema.sql` describes.** The
   deployed `projects` table has no `updated_at`, no `actual_end_date`, no
   `description`/`rag_status`/`budget`/`owner_id`/`health_score`/`ai_risk_score`/
   `tags`, and it HAS `archived` / `archived_at`, which appear in no migration
   file at all (added by hand). Applying this folder from scratch would not
   reproduce production.

Enabling the integration therefore needs the migration history to be baselined
first (existing state marked as already applied), not just the path corrected.

## What is actually applied in production

Verified against `information_schema.columns` on 2026-09-11:

| Migration | Applied? |
|-----------|----------|
| `001_initial_schema.sql` | Partially / never as written — live table differs |
| `0003_v2_fields.sql` | ✅ (subdivision, total_budget, utilized_budget, classified_dependencies) |
| `0005_project_tasks.sql` | ❌ **not applied** — `tasks` column absent |
| `0010_revised_date.sql` | ✅ |
| `0011_date_revisions.sql` | ✅ |
| `0012_expected_revenue.sql` | ❌ not applied |
| `0013_completed_at.sql` | ❌ not applied |

`0002`, `0006`–`0009` create their own tables and are not covered by the
`projects` column check above.

## To apply the outstanding ones

Paste each into the Supabase SQL editor, in this order:

1. `0005_project_tasks.sql` — **do this first.** Until the `tasks` column
   exists, the projects API cannot write it, and the write path previously
   discarded every other v2 field alongside it (budgets included). Fixed in
   commit 803d2b2, but the column is still needed for task persistence.
2. `0012_expected_revenue.sql`
3. `0013_completed_at.sql`

All three are `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — additive, nullable,
re-runnable, and they touch no existing rows.

## Destructive SQL lives elsewhere

`0004_v2_hierarchy.sql` has been moved to `supabase/manual/` precisely so that a
directory-sweeping automation can never execute it. See that folder's README.
