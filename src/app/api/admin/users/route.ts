import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin user-management API.
 *  GET   → list all users (id, email, name, department, role)
 *  PATCH → update a user's department + role
 *
 * Server-only: uses the service-role key (never exposed to the browser).
 * Every request is gated — the caller's Supabase access token must belong to a
 * user whose metadata role is cco / admin / super_admin.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SUPER_ADMIN_ROLES = ['cco', 'admin', 'super_admin'];

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Validate the bearer token and confirm the caller is a super admin. */
async function requireAdmin(request: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' };
  }
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Missing access token.' };

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'Invalid or expired session.' };

  const role = (data.user.user_metadata?.role as string) ?? 'user';
  if (!SUPER_ADMIN_ROLES.includes(role)) {
    return { ok: false, status: 403, error: 'Admin access required.' };
  }
  return { ok: true };
}

export async function GET(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { data, error } = await admin().auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      employee_code: (u.user_metadata?.employee_code as string) ?? '',
      full_name: (u.user_metadata?.full_name as string) ?? '',
      department: (u.user_metadata?.department as string) ?? null,
      role: (u.user_metadata?.role as string) ?? 'user',
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: { userId?: string; department?: string | null; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { userId, department, role } = body;
  if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  if (role && !['user', 'cco', 'admin', 'super_admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const client = admin();
  // Merge with existing metadata so we don't wipe employee_code / full_name etc.
  const { data: existing, error: fetchErr } = await client.auth.admin.getUserById(userId);
  if (fetchErr || !existing.user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const merged = {
    ...existing.user.user_metadata,
    ...(department !== undefined ? { department: department || null } : {}),
    ...(role !== undefined ? { role } : {}),
  };

  const { error } = await client.auth.admin.updateUserById(userId, { user_metadata: merged });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, department: merged.department ?? null, role: merged.role ?? 'user' });
}
