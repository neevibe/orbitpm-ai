-- Audit trail for Xyrenis Enterprise governance & compliance.
-- Run once in the Supabase SQL editor (or via the migration pipeline).
--
-- Every privileged action (registration, login, permission/department change,
-- project & risk mutations, profile updates, approvals) is appended here.
-- Rows are immutable: there is no UPDATE/DELETE policy, and all writes happen
-- server-side with the service-role key (which bypasses RLS).

create table if not exists public.audit_log (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  -- who
  actor_id         uuid,
  actor_name       text,
  actor_email      text,
  actor_department text,

  -- what
  action           text not null,            -- e.g. 'user.permission_change', 'auth.login'
  module           text,                     -- 'auth' | 'users' | 'projects' | 'risks' | 'profile'
  status           text not null default 'success',  -- 'success' | 'failure'

  -- on what
  entity_type      text,                     -- 'user' | 'project' | 'risk' | 'session'
  entity_id        text,
  entity_name      text,

  -- before / after
  previous_value   jsonb,
  new_value        jsonb,

  -- context
  ip_address       text,
  user_agent       text
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_email_idx on public.audit_log (actor_email);
create index if not exists audit_log_action_idx     on public.audit_log (action);
create index if not exists audit_log_module_idx     on public.audit_log (module);

-- Lock the table down: RLS on, no policies → only the service-role key (used by
-- the server API routes) can read or write. The browser anon key sees nothing.
alter table public.audit_log enable row level security;
