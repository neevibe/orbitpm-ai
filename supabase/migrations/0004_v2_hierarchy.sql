-- v2 HIERARCHY MIGRATION — DESTRUCTIVE. ⚠️ DO NOT RUN until sign-off.
-- This mutates LIVE production data (renames a department, moves CBB projects).
-- Until this runs, the app's org-structure config renders the new hierarchy at
-- the display layer, so production data is unchanged and fully reversible.
--
-- Run order: apply 0003_v2_fields.sql first (adds the `subdivision` column).

-- 1) Rename vertical: "Digital & Data" → "Digital Experience"
update public.departments
   set name = 'Digital Experience'
 where name = 'Digital & Data';

-- 2) Fold CBB into BASL: reassign the 5 CBB projects to BASL with subdivision=CBB.
update public.projects p
   set department_id = (select id from public.departments where name = 'BASL'),
       subdivision   = 'CBB'
 where p.department_id = (select id from public.departments where name = 'CBB');

-- 3) Remove CBB as a standalone vertical (only after its projects are moved).
delete from public.departments where name = 'CBB';

-- AFTER running this, update src/lib/org-structure.ts:
--   • DEPARTMENT_DISPLAY: drop the 'Digital & Data' entry (DB now stores the new name)
--   • TOP_LEVEL_DEPARTMENTS: replace 'Digital & Data' with 'Digital Experience'
--   • FOLDED_INTO: the CBB→BASL display fallback can be removed (data now reflects it)
