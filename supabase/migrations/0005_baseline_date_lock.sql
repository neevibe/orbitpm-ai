-- Migration 0005: Baseline Date Lock (Governance)
-- Adds two columns to enforce the locked-target-date governance requirement:
--   baseline_date      – the original target date, set once on project creation.
--                        Never updated after first write. Permanently preserved.
--   target_date_locked – true once a baseline has been set.
--                        Only admin-level users may change target_date after this point.
--
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING patterns used).
-- Back-fills baseline_date from target_date for all existing projects that already
-- have a target_date — this treats today's run as the "baseline moment" for legacy rows.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS baseline_date DATE,
  ADD COLUMN IF NOT EXISTS target_date_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Back-fill: existing projects that have a target_date get their baseline set now.
-- Projects with no target_date remain unlocked and will be baselined on their next save.
UPDATE projects
SET
  baseline_date      = target_date::DATE,
  target_date_locked = TRUE
WHERE
  target_date IS NOT NULL
  AND baseline_date IS NULL;

-- Index for any future queries that filter/sort by baseline_date.
CREATE INDEX IF NOT EXISTS idx_projects_baseline_date ON projects (baseline_date);
