-- ============================================
-- 0013 — Completion timestamp
-- Stamps the day a project is marked Completed. Without it the delay history
-- reconstruction (src/lib/delay-analytics.ts) can tell that a project became
-- delayed but never that it recovered, so the month-over-month delayed count
-- can only ever rise. Rows closed before this shipped stay NULL and are treated
-- as "never delayed" — which under-counts past months rather than inflating them.
-- Additive and nullable: safe to run repeatedly.
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at DATE;

COMMENT ON COLUMN projects.completed_at IS
  'Day the project was marked Completed. Drives delay-recovery history. NULL for rows closed before this column existed.';
