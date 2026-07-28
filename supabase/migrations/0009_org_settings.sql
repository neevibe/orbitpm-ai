-- Org-wide settings store (key/value). First consumer: the Microsoft Teams
-- incoming-webhook URL for automated channel alerts, configured on the
-- Integrations page by a super admin.
-- Run once in the Supabase SQL Editor.

create table if not exists org_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

-- RLS on, no policies: only the server (service-role key) reads or writes.
-- The webhook URL is a secret — it must never reach the browser.
alter table org_settings enable row level security;
