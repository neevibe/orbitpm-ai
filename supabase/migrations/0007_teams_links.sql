-- Phase 3a: MS Teams deep links — attach a Teams conversation to a project
-- (or a specific task). Run once in the Supabase SQL Editor.
--
-- v1 stores the LINK only (title + deep-link URL) — no message content is
-- cached, so there is nothing to leak. Live thread mirroring (Phase 3b)
-- arrives after the Azure AD app registration + Graph consent is in place.

create table if not exists teams_links (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  task_id text,                         -- matches jsonb task ids; null = project-level
  title text not null,
  deep_link_url text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_teams_links_project on teams_links(project_code);

-- RLS: enabled with no anon policies — reads/writes go through the app API,
-- which enforces the same departmental visibility rules as the register
-- (service-role client behind requireUser, like /api/projects).
alter table teams_links enable row level security;
