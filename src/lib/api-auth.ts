import { NextRequest, NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

/**
 * Server-side request authentication for API routes (Phase 0).
 *
 * Every data-bearing route must call requireUser() (or requireAdmin()) before
 * touching the database. Validation happens against Supabase auth with the
 * caller's own Bearer token — the service-role key is never used to decide
 * WHO someone is, only (after this gate) to perform the work.
 *
 * Authorization claims are read from app_metadata FIRST (admin-controlled,
 * not editable by the user), falling back to user_metadata for accounts that
 * predate the metadata migration (scripts/migrate-authz-metadata.mjs).
 */

// Same public fallbacks as src/lib/supabase.ts (the anon key ships in the
// client bundle by design — it can only validate sessions, never bypass RLS).
// The SERVICE key has no fallback anywhere.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const ADMIN_ROLES = ['cco', 'admin', 'super_admin'];
const PERMS = ['view', 'edit', 'modify', 'admin'] as const;
export type ServerPermission = (typeof PERMS)[number];

function claim(user: User, key: string): string | undefined {
  const fromApp = (user.app_metadata as Record<string, unknown> | undefined)?.[key];
  if (typeof fromApp === 'string' && fromApp.trim()) return fromApp;
  const fromUser = (user.user_metadata as Record<string, unknown> | undefined)?.[key];
  if (typeof fromUser === 'string' && fromUser.trim()) return fromUser;
  return undefined;
}

/** Mirror of the client's permission derivation, evaluated server-side. */
export function serverPermission(user: User): ServerPermission {
  const p = claim(user, 'permission');
  if (p && (PERMS as readonly string[]).includes(p)) return p as ServerPermission;
  const role = claim(user, 'role') ?? 'user';
  if (ADMIN_ROLES.includes(role)) return 'admin';
  if (user.email?.toLowerCase() === 'neeraj.p@bialairport.com') return 'admin';
  if (claim(user, 'department')) return 'modify';
  return 'view';
}

export function serverDepartment(user: User): string | null {
  return claim(user, 'department') ?? null;
}

type AuthResult = { user: User; error: null } | { user: null; error: NextResponse };

/**
 * Validate the caller's Bearer token. Returns the verified user, or a ready
 * 401/503 response to return as-is. Never trusts request-body identity fields.
 */
export async function requireUser(request: NextRequest | Request): Promise<AuthResult> {
  if (!SUPABASE_URL || !ANON_KEY) {
    return { user: null, error: NextResponse.json({ error: 'Auth is not configured on the server.' }, { status: 503 }) };
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { user: null, error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }
  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return { user: null, error: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }) };
    }
    return { user: data.user, error: null };
  } catch {
    return { user: null, error: NextResponse.json({ error: 'Could not validate session.' }, { status: 503 }) };
  }
}

/** requireUser + admin permission (explicit grant, admin role, or owner). */
export async function requireAdmin(request: NextRequest | Request): Promise<AuthResult> {
  const res = await requireUser(request);
  if (res.error) return res;
  if (serverPermission(res.user) !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  }
  return res;
}

/**
 * Canonical department name — mirrors normalizeDeptName in data-context so a
 * user whose claim says "Digital" scopes to projects filed under
 * "Digital & Data" (claims come from the admin UI's short names, project rows
 * from the workbook's long names).
 */
export function normalizeDept(d: string | null | undefined): string {
  if (!d) return '';
  const s = d.toLowerCase().trim();
  if (s.startsWith('digital')) return 'digital & data';
  if (s.startsWith('advertis')) return 'advertising & marketing';
  if (s.startsWith('duty') || s === 'dutyfree') return 'duty free';
  if (s.startsWith('commercial')) return 'commercial development';
  if (s.startsWith('oper')) return 'operations';
  if (s === 'basl' || s === 'cbb' || s === 'ccb' || s.startsWith('amen')) return 'basl';
  return s;
}

type DepLike = { kind?: string; department?: string | null } | null;

/** True when a project carries an internal dependency targeting `dept`. */
export function dependsOnDepartment(classifiedDependencies: unknown, dept: string): boolean {
  if (!dept || !Array.isArray(classifiedDependencies)) return false;
  return (classifiedDependencies as DepLike[]).some(
    d => d && d.kind === 'internal' && normalizeDept(d.department) === dept,
  );
}
