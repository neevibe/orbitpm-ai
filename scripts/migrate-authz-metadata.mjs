#!/usr/bin/env node
/**
 * Phase 0 — copy authorization claims from user_metadata to app_metadata.
 *
 * WHY: user_metadata is editable by the user themselves (supabase.auth.updateUser),
 * so roles/permissions stored there can be self-escalated. app_metadata can only
 * be written with the service-role key. After this migration, both the app and
 * the API prefer app_metadata (falling back to user_metadata only for accounts
 * that haven't been migrated yet).
 *
 * RUN (once, from a machine with the service key — e.g. paste into a terminal
 * with the values from Vercel → Settings → Environment Variables):
 *
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   node scripts/migrate-authz-metadata.mjs
 *
 * Idempotent: re-running only fills missing app_metadata keys, never overwrites.
 */

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const CLAIMS = ['role', 'permission', 'department'];
const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json' };

let page = 1, migrated = 0, skipped = 0;
for (;;) {
  const res = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=50`, { headers });
  if (!res.ok) { console.error(`List users failed: ${res.status} ${await res.text()}`); process.exit(1); }
  const { users } = await res.json();
  if (!users?.length) break;

  for (const u of users) {
    const um = u.user_metadata || {};
    const am = u.app_metadata || {};
    const patch = {};
    for (const k of CLAIMS) {
      if (typeof um[k] === 'string' && um[k].trim() && !(typeof am[k] === 'string' && am[k].trim())) {
        patch[k] = um[k];
      }
    }
    if (Object.keys(patch).length === 0) { skipped++; continue; }
    const up = await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ app_metadata: { ...am, ...patch } }),
    });
    if (up.ok) { migrated++; console.log(`✓ ${u.email}: ${JSON.stringify(patch)}`); }
    else { console.error(`✗ ${u.email}: ${up.status} ${await up.text()}`); }
  }
  page++;
}
console.log(`\nDone. Migrated ${migrated} users, ${skipped} already current.`);
