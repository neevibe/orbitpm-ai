-- ============================================
-- 0014 — Automatic delay flagging (scheduled)
--
-- The app normalises status on READ, so the dashboard is always correct. But a
-- deadline passing is a TIME event, not a row event: nothing in the database
-- changes when a target date slips into the past, so a stored row stayed
-- "In Progress" until somebody happened to open and save that project. Exports,
-- the AI assistant and any direct SQL therefore disagreed with the dashboard.
--
-- This schedules the same rule the app applies on read, so the stored data
-- corrects itself nightly with nobody touching anything. A plain trigger cannot
-- do this — there is no INSERT or UPDATE to hang it on.
--
-- Every run that changes something writes ONE audit_log row. Automated writes
-- that leave no trace are how the v2-column data loss went unnoticed for months;
-- this one is visible in the audit trail like any other change.
-- ============================================

create extension if not exists pg_cron;

-- ── The rule ────────────────────────────────────────────────────────────────
-- Mirrors normalizeProjectStatus + reconcileStatusProgress in src/lib/utils.ts.
-- Dates are evaluated in Asia/Kolkata, not UTC: users read "overdue" against
-- their own calendar day, and the database defaulting to UTC would flip
-- projects 5h30m early every night.
create or replace function public.apply_delay_rule()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  n_delayed   integer := 0;
  n_restored  integer := 0;
  n_completed integer := 0;
begin
  -- PROMOTE: in-flight work whose target date has strictly passed.
  -- "Not Started" and "On Hold" are deliberately excluded — an overdue project
  -- that never began is a planning failure, not a delivery one, and relabelling
  -- it would hide which is which.
  update public.projects
     set status = 'Delayed'
   where status = 'In Progress'
     and target_date is not null
     and target_date < today_ist
     and coalesce(progress, 0) < 100
     and not coalesce(archived, false);
  get diagnostics n_delayed = row_count;

  -- DEMOTE: flagged Delayed but the target date is still in the future.
  -- A target of exactly today is left alone by both halves, so the two rules
  -- can never fight over the same row.
  update public.projects
     set status = 'In Progress'
   where status = 'Delayed'
     and target_date is not null
     and target_date > today_ist
     and not coalesce(archived, false);
  get diagnostics n_restored = row_count;

  -- Completed ⇔ 100%: a project at full progress is finished, late or not.
  update public.projects
     set status = 'Completed'
   where coalesce(progress, 0) >= 100
     and status <> 'Completed'
     and not coalesce(archived, false);
  get diagnostics n_completed = row_count;

  if (n_delayed + n_restored + n_completed) > 0 then
    insert into public.audit_log (
      actor_name, actor_email, action, module, status, entity_type, entity_name, new_value
    ) values (
      'Automatic delay rule', 'system@xyrenis', 'project.auto_status', 'projects', 'success',
      'project', 'Scheduled status reconciliation',
      jsonb_build_object(
        'markedDelayed',   n_delayed,
        'restoredToInProgress', n_restored,
        'markedCompleted', n_completed,
        'evaluatedFor',    today_ist
      )
    );
  end if;

  return jsonb_build_object(
    'markedDelayed', n_delayed,
    'restoredToInProgress', n_restored,
    'markedCompleted', n_completed,
    'evaluatedFor', today_ist
  );
end;
$$;

comment on function public.apply_delay_rule() is
  'Applies the Delayed / Completed status rules to stored rows. Mirrors normalizeProjectStatus in src/lib/utils.ts. Scheduled nightly by pg_cron; safe to run by hand at any time.';

-- ── The schedule ────────────────────────────────────────────────────────────
-- 18:30 UTC = 00:00 IST. Re-scheduling the same job name replaces it, so this
-- migration stays safe to re-run.
select cron.unschedule('apply-delay-rule')
 where exists (select 1 from cron.job where jobname = 'apply-delay-rule');

select cron.schedule(
  'apply-delay-rule',
  '30 18 * * *',
  $$ select public.apply_delay_rule(); $$
);

-- Bring the stored data in line immediately rather than waiting for midnight.
select public.apply_delay_rule();
