import { NextRequest, NextResponse } from 'next/server';
import { recordAudit, actorFromToken } from '@/lib/audit';
import { requireUser } from '@/lib/api-auth';

/**
 * Emails an externally-assigned task to its recipient.
 *
 * Uses the Resend HTTP API directly (no SDK dependency). Configure in the
 * server environment (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY  — required for sending
 *   TASK_MAIL_FROM  — verified sender, e.g. "Xyrenis <tasks@yourdomain.com>"
 * Without RESEND_API_KEY the route responds { sent: false, reason } so the UI
 * can tell the user the task saved but no email went out.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.TASK_MAIL_FROM || 'Xyrenis <onboarding@resend.dev>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function POST(request: NextRequest) {
  // Phase 0: only signed-in users may send task emails (was an open relay).
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  let body: {
    to?: string;
    assigneeName?: string | null;
    taskName?: string;
    projectId?: string;
    projectName?: string;
    dueDate?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const to = (body.to || '').trim().toLowerCase();
  const taskName = (body.taskName || '').trim();
  const projectName = (body.projectName || '').trim();
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'A valid recipient email is required.' }, { status: 400 });
  if (!taskName) return NextResponse.json({ error: 'taskName is required.' }, { status: 400 });

  const actor = await actorFromToken(
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim(),
  );
  const assignedBy = actor?.name || actor?.email || 'The project team';
  const greeting = body.assigneeName ? `Hi ${esc(body.assigneeName)},` : 'Hi,';
  const due = body.dueDate ? new Date(body.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="font-size:18px;margin:0 0 4px">New task assigned to you</h2>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px">via Xyrenis — BLR Airport work operating system</p>
      <p style="font-size:14px">${greeting}</p>
      <p style="font-size:14px">${esc(assignedBy)} has assigned you a task${projectName ? ` on the project <strong>${esc(projectName)}</strong>` : ''}:</p>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:16px 0">
        <p style="font-size:15px;font-weight:bold;margin:0 0 8px">${esc(taskName)}</p>
        ${projectName ? `<p style="font-size:13px;margin:4px 0"><strong>Project:</strong> ${esc(projectName)}${body.projectId ? ` (${esc(body.projectId)})` : ''}</p>` : ''}
        ${due ? `<p style="font-size:13px;margin:4px 0"><strong>Due date:</strong> ${esc(due)}</p>` : ''}
        <p style="font-size:13px;margin:4px 0"><strong>Assigned by:</strong> ${esc(assignedBy)}</p>
      </div>
      <p style="font-size:12px;color:#64748b">Please coordinate with ${esc(assignedBy)} for any questions about this task.</p>
    </div>`;

  let sent = false;
  let reason: string | undefined;
  if (!RESEND_API_KEY) {
    reason = 'Task saved, but email is not configured on the server (set RESEND_API_KEY and TASK_MAIL_FROM).';
  } else {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: [to],
          subject: `New task assigned: ${taskName}`,
          html,
        }),
      });
      if (res.ok) {
        sent = true;
      } else {
        const err = await res.json().catch(() => ({} as { message?: string }));
        reason = `Task saved, but the email provider rejected the send${err.message ? ` (${err.message})` : ` (HTTP ${res.status})`}.`;
      }
    } catch {
      reason = 'Task saved, but the email provider could not be reached.';
    }
  }

  await recordAudit({
    actor,
    action: 'task.assign_external',
    module: 'projects',
    status: sent ? 'success' : 'failure',
    entityType: 'task',
    entityId: body.projectId || undefined,
    entityName: taskName,
    newValue: { to, projectName: projectName || null, dueDate: body.dueDate || null, emailSent: sent },
    request,
  });

  return NextResponse.json({ ok: true, sent, reason });
}
