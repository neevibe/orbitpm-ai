-- ============================================
-- 0011 — Date revision audit trail
-- Stores the full history of Target/Revised date changes for each project.
-- Each element: { previousTargetDate, revisedDate, changedAt, changedBy }.
-- The revised_date column (migration 0010) holds the current/latest value;
-- this column keeps every revision. Safe to run repeatedly.
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS date_revisions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN projects.date_revisions IS
  'Audit trail of date revisions: [{previousTargetDate, revisedDate, changedAt, changedBy}], oldest first.';
