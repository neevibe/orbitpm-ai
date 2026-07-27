-- Per-project task list, stored as a JSONB array of task objects
-- (id, name, assignee, assigneeEmail, external, status, priority, progress,
--  startDate/endDate/dueDate, RACI fields, dependencies).
--
-- Until this runs, the projects API strips the column on write (same graceful
-- pattern as the 0003 v2 fields) and task edits do not persist across reloads.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tasks jsonb;
