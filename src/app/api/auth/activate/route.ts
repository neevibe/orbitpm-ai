import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

/**
 * Pre-provisioned user activation / external self-registration.
 *
 * Every BIAL employee is loaded into Supabase Auth ahead of time from the
 * Employee Master (see scripts/seed-users.js). Those accounts exist but are
 * NOT yet activated — the user has never chosen their own password. A normal
 * supabase.auth.signUp() would fail with "User already registered", which is
 * exactly the bug this route fixes.
 *
 * POST { email, password }
 *   • email is pre-provisioned & NOT activated → set their password, mark
 *     activated, inherit their department / role / permissions. → 200
 *   • email is pre-provisioned & ALREADY activated → 409 "already registered".
 *   • email is unknown → create a brand-new EXTERNAL account (restricted,
 *     view-only, pending admin approval). → 200
 *
 * No confirmation email is ever sent (email_confirm: true) — this matches the
 * deployment's disabled-email-confirmation setting and avoids rate limits.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const INTERNAL_DOMAIN = '@bialairport.com';

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Supabase has no get-by-email admin call, so page through the user list. */
async function findUserByEmail(client: ReturnType<typeof admin>, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  // 88 employees today; page generously in case the directory grows.
  for (; page <= 20; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find(u => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

export async function POST(request: Request) {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const client = admin();
  const isInternal = email.endsWith(INTERNAL_DOMAIN);

  let existing;
  try {
    existing = await findUserByEmail(client, email);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Lookup failed.' }, { status: 500 });
  }

  /* ---------- 1. Brand-new account (not in the directory) ---------- */
  if (!existing) {
    const { error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'user',
        // Internal emails get baseline view access; external users are
        // restricted and need explicit admin approval for anything more.
        permission: 'view',
        userType: isInternal ? 'internal' : 'external',
        account_status: 'active',
        activated: true,
        must_change_password: false,
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordAudit({
      actor: { email, name: null },
      action: 'auth.register',
      module: 'auth',
      entityType: 'user',
      entityName: email,
      newValue: { userType: isInternal ? 'internal' : 'external', permission: 'view' },
      request,
    });
    return NextResponse.json({ ok: true, created: true, userType: isInternal ? 'internal' : 'external' });
  }

  /* ---------- 2. Pre-provisioned account ---------- */
  const meta = existing.user_metadata || {};
  // Activated == the user has already chosen their own password (either via this
  // route, or the legacy forced-change flow which clears must_change_password).
  const alreadyActivated = meta.activated === true || meta.must_change_password === false;

  if (alreadyActivated) {
    return NextResponse.json(
      { error: 'This account is already active. Please sign in instead.', code: 'already_active' },
      { status: 409 },
    );
  }

  // Activate: set the chosen password, keep department / role / employee_code.
  const { error } = await client.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...meta,
      userType: meta.userType || (isInternal ? 'internal' : 'external'),
      account_status: 'active',
      activated: true,
      must_change_password: false,
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    actor: { id: existing.id, email, name: (meta.full_name as string) || null, department: (meta.department as string) || null },
    action: 'auth.activate',
    module: 'auth',
    entityType: 'user',
    entityId: existing.id,
    entityName: (meta.full_name as string) || email,
    newValue: { account_status: 'active', department: meta.department ?? null },
    request,
  });

  return NextResponse.json({ ok: true, activated: true, department: meta.department ?? null });
}
