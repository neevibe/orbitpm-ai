import { NextRequest } from 'next/server';
import crypto from 'node:crypto';

/** Shared helpers for the Microsoft Teams OAuth flow (see /api/integrations/teams). */

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

export const MS_CLIENT_ID = process.env.MS_TEAMS_CLIENT_ID || '';
export const MS_CLIENT_SECRET = process.env.MS_TEAMS_CLIENT_SECRET || '';
export const MS_TENANT = process.env.MS_TEAMS_TENANT_ID || 'organizations';
// One consent covers Teams (Chat.Read), Outlook Calendar (Calendars.ReadWrite)
// and task emails (Mail.Send) — all delegated, no admin-only scopes.
export const MS_SCOPES = 'offline_access User.Read Chat.Read Calendars.ReadWrite Mail.Send';

export function appOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
}

/** Short-lived HMAC-signed state so the OAuth callback can trust the user id. */
export function signState(userId: string): string {
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', SERVICE_KEY).update(payload).digest('hex').slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyState(state: string): string | null {
  try {
    const [userId, expStr, sig] = Buffer.from(state, 'base64url').toString().split('.');
    if (!userId || !expStr || !sig) return null;
    if (Date.now() > Number(expStr)) return null;
    const expect = crypto.createHmac('sha256', SERVICE_KEY).update(`${userId}.${expStr}`).digest('hex').slice(0, 32);
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect)) ? userId : null;
  } catch {
    return null;
  }
}
