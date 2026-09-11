-- ============================================
-- 0012 — Expected annual revenue
-- The single financial input behind delay revenue-impact reporting: the revenue
-- (or quantified saving) a project is expected to generate per year once live.
-- Delay impact accrues straight-line at expected_annual_revenue / 365 per day
-- past the Target Date. NULL means "not quantified" — such projects are counted
-- and named in the impact report rather than silently treated as zero.
-- Additive and nullable: safe to run repeatedly, zero impact until populated.
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_annual_revenue NUMERIC;

COMMENT ON COLUMN projects.expected_annual_revenue IS
  'Expected annual revenue or quantified saving in INR once the project is live. Drives delay revenue-impact. NULL = not quantified.';
