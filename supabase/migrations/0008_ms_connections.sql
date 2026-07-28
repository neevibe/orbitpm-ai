-- Phase 3b foundation: per-user Microsoft 365 connections (delegated OAuth).
-- Run once in the Supabase SQL Editor.
--
-- Stores each user's Microsoft tokens after they click "Connect" on the
-- Integrations page. Tokens are only ever read server-side (service role);
-- RLS is enabled with no anon policies, so no client can touch this table.

create table if not exists ms_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_email text not null default '',
  account_name text not null default '',
  access_token text not null,
  refresh_token text not null default '',
  expires_at timestamptz not null,
  scopes text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ms_connections enable row level security;
