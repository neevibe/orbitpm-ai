-- Phase 2: Personal Workspace — private per-user data, enforced by RLS.
-- Run this in the Supabase SQL Editor (like migration 0005).
--
-- Personal data NEVER mixes with the org register: separate tables, separate
-- API, policies hard-locked to the owning user. Not even admins can read
-- another user's personal workspace through the app API (it uses the
-- caller's own token, so RLS applies to everyone equally).

create table if not exists personal_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'Not Started',
  priority text not null default 'Medium',
  progress int not null default 0 check (progress between 0 and 100),
  target_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists custom_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  columns jsonb not null default '[]',  -- [{key,label,type:'text'|'number'|'date'|'select',options?}]
  rows jsonb not null default '[]',     -- [{<colKey>: <value>, ...}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)          -- one diary page per day
);

alter table personal_projects enable row level security;
alter table custom_tables   enable row level security;
alter table diary_entries   enable row level security;

drop policy if exists "own personal_projects" on personal_projects;
create policy "own personal_projects" on personal_projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own custom_tables" on custom_tables;
create policy "own custom_tables" on custom_tables
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own diary_entries" on diary_entries;
create policy "own diary_entries" on diary_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_personal_projects_user on personal_projects(user_id);
create index if not exists idx_custom_tables_user     on custom_tables(user_id);
create index if not exists idx_diary_entries_user     on diary_entries(user_id, entry_date desc);
