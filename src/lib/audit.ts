import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only audit helper. Never import this from a client component.
 *
 * recordAudit() is intentionally NON-BLOCKING and NEVER throws — auditing must
 * not break the action being audited. If the audit_log table doesn't exist yet
 * (migration 0002 not run) or the service-role key is missing, it quietly
 * no-ops. Reads happen with the service-role key so RLS is bypassed.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function auditClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY || ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AuditActor {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
}

export interface AuditEntryInput {
  actor?: AuditActor;
  action: string;                 // 'user.permission_change', 'auth.login', 'project.update', …
  module?: string;                // 'auth' | 'users' | 'projects' | 'risks' | 'profile'
  status?: 'success' | 'failure';
  entityType?: string;
  entityId?: string;
  entityName?: string;
  previousValue?: unknown;
  newValue?: unknown;
  request?: Request;              // used to extract IP + user-agent
}

/** Pull the client IP + user-agent off the incoming request, best-effort. */
function context(request?: Request) {
  if (!request) return { ip_address: null as string | null, user_agent: null as string | null };
  const h = request.headers;
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null;
  return { ip_address: ip, user_agent: h.get('user-agent') };
}

/** Resolve the acting user from a Supabase bearer token (best-effort). */
export async function actorFromToken(token: string | null | undefined): Promise<AuditActor | undefined> {
  if (!token) return undefined;
  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data } = await client.auth.getUser(token);
    const u = data.user;
    if (!u) return undefined;
    const m = u.user_metadata || {};
    return {
      id: u.id,
      name: (m.full_name as string) || null,
      email: u.email || null,
      department: (m.department as string) || null,
    };
  } catch {
    return undefined;
  }
}

/** Fire-and-forget audit write. Awaitable but never rejects. */
export async function recordAudit(entry: AuditEntryInput): Promise<void> {
  try {
    const { ip_address, user_agent } = context(entry.request);
    const row = {
      actor_id: entry.actor?.id ?? null,
      actor_name: entry.actor?.name ?? null,
      actor_email: entry.actor?.email ?? null,
      actor_department: entry.actor?.department ?? null,
      action: entry.action,
      module: entry.module ?? null,
      status: entry.status ?? 'success',
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      entity_name: entry.entityName ?? null,
      previous_value: entry.previousValue ?? null,
      new_value: entry.newValue ?? null,
      ip_address,
      user_agent,
    };
    await auditClient().from('audit_log').insert(row);
  } catch {
    // swallow — auditing must never break the audited action
  }
}
