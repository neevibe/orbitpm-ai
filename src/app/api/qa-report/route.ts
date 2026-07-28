import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * QA report mailer — lets the daily QA agent (which runs headless, with no
 * user credentials) email its report to the owner.
 *
 * Auth: Bearer <QA_REPORT_SECRET> (a machine secret, NOT a user token) —
 * constant-time compared. The endpoint is disabled until the env var exists.
 *
 * Env (Vercel → Settings → Environment Variables):
 *   QA_REPORT_SECRET — long random string; same value goes into the Claude
 *                      environment variables so the QA agent can send
 *   RESEND_API_KEY   — Resend API key (same one task emails use)
 *   TASK_MAIL_FROM   — verified sender (shared with task emails)
 *   QA_REPORT_TO     — recipient; defaults to the owner
 */

const SECRET = process.env.QA_REPORT_SECRET || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.TASK_MAIL_FROM || 'Xyrenis <onboarding@resend.dev>';
const MAIL_TO = process.env.QA_REPORT_TO || 'neeraj.p@bialairport.com';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function authorized(request: NextRequest): boolean {
  if (!SECRET) return false;
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ error: 'QA report mailer is not configured (set QA_REPORT_SECRET).' }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email is not configured (set RESEND_API_KEY).' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({} as { subject?: string; report?: string }));
  const report = String(body.report || '').trim().slice(0, 60_000);
  if (!report) return NextResponse.json({ error: 'report text is required.' }, { status: 400 });
  const subject = String(body.subject || '').trim().slice(0, 150) ||
    `Xyrenis daily QA report — ${new Date().toISOString().slice(0, 10)}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="font-size:18px;margin:0 0 4px">${esc(subject)}</h2>
      <p style="font-size:12px;color:#64748b;margin:0 0 16px">Automated QA agent · Xyrenis — BLR Airport work operating system</p>
      <pre style="font-size:12.5px;line-height:1.55;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">${esc(report)}</pre>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_TO], subject, html }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    return NextResponse.json({ error: `Resend rejected the email: ${detail}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to: MAIL_TO });
}
