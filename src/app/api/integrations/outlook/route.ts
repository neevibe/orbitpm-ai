import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';
import { getGraphToken, graphFetch } from '@/lib/ms-graph';

/**
 * Outlook actions on tasks — schedule a calendar meeting or send an email,
 * both via the caller's own Microsoft account (delegated Graph tokens from
 * the Integrations page connect flow). Nothing is sent as a service account:
 * the meeting organizer / mail sender is always the signed-in user.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanEmails = (list: unknown): string[] =>
  (Array.isArray(list) ? list : [])
    .map(e => String(e).trim())
    .filter(e => EMAIL_RE.test(e))
    .slice(0, 30);

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const action = body.action as string;

  const tok = await getGraphToken(db(), auth.user.id);
  if ('error' in tok) return NextResponse.json({ error: tok.error, needsConnect: tok.status === 412 }, { status: tok.status });

  if (action === 'schedule') {
    const subject = String(body.subject || '').trim().slice(0, 200);
    const startISO = String(body.start || '');
    const durationMins = Math.min(Math.max(Number(body.durationMins) || 30, 5), 480);
    const attendees = cleanEmails(body.attendees);
    const notes = String(body.notes || '').trim().slice(0, 4000);
    const onlineMeeting = body.onlineMeeting !== false;

    if (!subject) return NextResponse.json({ error: 'Give the meeting a subject.' }, { status: 400 });
    const start = new Date(startISO);
    if (isNaN(start.getTime())) return NextResponse.json({ error: 'Pick a valid date and time.' }, { status: 400 });
    const end = new Date(start.getTime() + durationMins * 60 * 1000);

    const event = {
      subject,
      body: { contentType: 'Text', content: notes },
      start: { dateTime: start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
      attendees: attendees.map(address => ({ emailAddress: { address }, type: 'required' })),
      isOnlineMeeting: onlineMeeting,
      ...(onlineMeeting ? { onlineMeetingProvider: 'teamsForBusiness' } : {}),
    };

    const res = await graphFetch(tok.token, '/me/events', { method: 'POST', body: JSON.stringify(event) });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    const created = res.data as { webLink?: string; onlineMeeting?: { joinUrl?: string } };
    return NextResponse.json({
      ok: true,
      webLink: created.webLink || '',
      joinUrl: created.onlineMeeting?.joinUrl || '',
    });
  }

  if (action === 'email') {
    const to = cleanEmails(body.to);
    const subject = String(body.subject || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 10000);

    if (to.length === 0) return NextResponse.json({ error: 'Add at least one valid recipient email.' }, { status: 400 });
    if (!subject) return NextResponse.json({ error: 'Give the email a subject.' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'Write a message.' }, { status: 400 });

    const res = await graphFetch(tok.token, '/me/sendMail', {
      method: 'POST',
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'Text', content: message },
          toRecipients: to.map(address => ({ emailAddress: { address } })),
        },
        saveToSentItems: true,
      }),
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
