-- ============================================
-- 0010 — Revised Date
-- Adds a user-editable "revised deadline" to projects. The original target_date
-- is locked after creation (admins excepted); timeline slips are recorded here.
-- The Delayed rule stays keyed on target_date, NOT this column.
-- Safe to run repeatedly.
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS revised_date DATE;

COMMENT ON COLUMN projects.revised_date IS
  'User-editable revised deadline. Does not affect the Delayed rule (that uses target_date).';
