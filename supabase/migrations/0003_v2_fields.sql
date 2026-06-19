-- v2 ADDITIVE FIELDS — safe, backward-compatible, prod-invisible.
-- Adds nullable columns the v2 UI writes (subdivision, financials, classified
-- dependencies). The current production app does SELECT specific columns and
-- never writes these, so adding them has ZERO impact until v2 ships.
--
-- Run this in the Supabase SQL editor at rollout to enable persistence of the
-- new fields. (Reversible: each column can be dropped.)

alter table public.projects add column if not exists subdivision text;
alter table public.projects add column if not exists total_budget numeric;
alter table public.projects add column if not exists utilized_budget numeric;
alter table public.projects add column if not exists classified_dependencies jsonb;
