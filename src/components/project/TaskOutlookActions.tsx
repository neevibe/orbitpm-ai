'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, Mail, X, Loader2, CheckCircle2, ExternalLink, Video } from 'lucide-react';
import Link from 'next/link';
import { authedFetch } from '@/lib/supabase';
import { toast } from '@/components/ui/Toaster';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';

/**
 * Per-task Outlook actions — schedule a meeting or send an email about the
 * task via the signed-in user's own Microsoft account (Graph delegated).
 * Requires a one-time "Connect" on the Integrations page; until then the
 * API answers 412 and we point people there.
 */

type TaskLike = {
  id: string;
  name: string;
  assignee?: string;
  assigneeEmail?: string;
  status?: string;
  dueDate?: string;
};

/** Exact full-name roster lookup (safe, unlike first-name guessing). */
function emailForAssignee(task: TaskLike): string {
  if (task.assigneeEmail) return task.assigneeEmail;
  const name = (task.assignee || '').trim().toLowerCase();
  if (!name) return '';
  return BIAL_EMPLOYEES.find(e => e.name.trim().toLowerCase() === name)?.email || '';
}

function tomorrowStr(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TaskOutlookActions({ task, projectName, projectCode }: {
  task: TaskLike;
  projectName: string;
  projectCode: string;
}) {
  const [mode, setMode] = useState<'schedule' | 'email' | null>(null);

  return (
    <>
      <button
        onClick={() => setMode('schedule')}
        title="Schedule a meeting about this task"
        className="p-1.5 rounded-md text-[var(--color-x-text-muted)] opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 transition-all"
      >
        <CalendarPlus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setMode('email')}
        title="Email about this task"
        className="p-1.5 rounded-md text-[var(--color-x-text-muted)] opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-50 transition-all"
      >
        <Mail className="w-3.5 h-3.5" />
      </button>
      {mode && (
        <OutlookModal
          mode={mode}
          task={task}
          projectName={projectName}
          projectCode={projectCode}
          onClose={() => setMode(null)}
        />
      )}
    </>
  );
}

function OutlookModal({ mode, task, projectName, projectCode, onClose }: {
  mode: 'schedule' | 'email';
  task: TaskLike;
  projectName: string;
  projectCode: string;
  onClose: () => void;
}) {
  const assigneeEmail = useMemo(() => emailForAssignee(task), [task]);
  const taskContext = `Task: ${task.name}\nProject: ${projectName} (${projectCode})${task.status ? `\nStatus: ${task.status}` : ''}${task.dueDate ? `\nDue: ${task.dueDate}` : ''}`;

  // schedule fields
  const [subject, setSubject] = useState(
    mode === 'schedule' ? `${task.name} — ${projectName}` : `Regarding task: ${task.name} (${projectCode})`
  );
  const [date, setDate] = useState(tomorrowStr());
  const [time, setTime] = useState('10:00');
  const [durationMins, setDurationMins] = useState(30);
  const [attendees, setAttendees] = useState(assigneeEmail);
  const [onlineMeeting, setOnlineMeeting] = useState(true);
  const [notes, setNotes] = useState(taskContext);

  // email fields
  const [to, setTo] = useState(assigneeEmail);
  const [message, setMessage] = useState(`Hi${task.assignee ? ` ${task.assignee.split(' ')[0]}` : ''},\n\n\n\n—\n${taskContext}`);

  const [sending, setSending] = useState(false);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [done, setDone] = useState<{ webLink: string; joinUrl: string } | null>(null);

  const splitEmails = (raw: string) => raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);

  const submit = async () => {
    setSending(true);
    setNeedsConnect(false);
    try {
      const payload = mode === 'schedule'
        ? {
            action: 'schedule',
            subject,
            start: new Date(`${date}T${time}`).toISOString(),
            durationMins,
            attendees: splitEmails(attendees),
            notes,
            onlineMeeting,
          }
        : { action: 'email', to: splitEmails(to), subject, message };

      const res = await authedFetch('/api/integrations/outlook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        if (j.needsConnect) { setNeedsConnect(true); return; }
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      if (mode === 'email') {
        toast({ kind: 'success', text: 'Email sent from your Outlook account.' });
        onClose();
      } else {
        setDone({ webLink: j.webLink || '', joinUrl: j.joinUrl || '' });
      }
    } catch (e) {
      toast({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div className="x-card w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--color-x-text)] flex items-center gap-2">
            {mode === 'schedule' ? <CalendarPlus className="w-4 h-4 text-blue-500" /> : <Mail className="w-4 h-4 text-blue-500" />}
            {mode === 'schedule' ? 'Schedule a meeting' : 'Email about this task'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:bg-[var(--color-x-surface-2)]"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-[13px] font-semibold text-[var(--color-x-text)]">Meeting scheduled</p>
            <p className="text-[12px] text-[var(--color-x-text-muted)]">Invites are on their way from your Outlook calendar.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {done.webLink && (
                <a href={done.webLink} target="_blank" rel="noopener noreferrer" className="x-btn text-[12px] px-3 py-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Outlook
                </a>
              )}
              {done.joinUrl && (
                <a href={done.joinUrl} target="_blank" rel="noopener noreferrer" className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" /> Teams join link
                </a>
              )}
            </div>
            <button onClick={onClose} className="text-[12px] text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] underline">Done</button>
          </div>
        ) : needsConnect ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-[13px] font-semibold text-[var(--color-x-text)]">Connect Microsoft first</p>
            <p className="text-[12px] text-[var(--color-x-text-muted)] max-w-sm mx-auto">
              This sends from <b>your own</b> Outlook account, so a one-time Microsoft sign-in is needed.
            </p>
            <Link href="/integrations" className="x-btn x-btn-primary text-[12px] px-3 py-1.5 inline-flex items-center gap-1.5">
              Go to Integrations <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Subject</label>
                <input className="x-input" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>

              {mode === 'schedule' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Date</label>
                      <input type="date" className="x-input" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Time</label>
                      <input type="time" className="x-input" value={time} onChange={e => setTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Duration</label>
                      <select className="x-input" value={durationMins} onChange={e => setDurationMins(Number(e.target.value))}>
                        {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Attendees (emails, comma-separated)</label>
                    <input className="x-input font-mono text-[12px]" placeholder="name@bialairport.com, …" value={attendees} onChange={e => setAttendees(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Agenda / notes</label>
                    <textarea className="x-input min-h-20 text-[12px]" rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 text-[12px] text-[var(--color-x-text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={onlineMeeting} onChange={e => setOnlineMeeting(e.target.checked)} className="accent-blue-600" />
                    <Video className="w-3.5 h-3.5" /> Make it a Teams online meeting
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">To (emails, comma-separated)</label>
                    <input className="x-input font-mono text-[12px]" placeholder="name@bialairport.com, …" value={to} onChange={e => setTo(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-x-text-secondary)] block mb-1">Message</label>
                    <textarea className="x-input min-h-32 text-[12px]" rows={7} value={message} onChange={e => setMessage(e.target.value)} />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-x-border)]">
              <p className="text-[11px] text-[var(--color-x-text-faint)]">Sent from your Microsoft account</p>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="x-btn text-[12px] px-3 py-1.5">Cancel</button>
                <button onClick={submit} disabled={sending} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
                  {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {sending ? 'Working…' : mode === 'schedule' ? 'Schedule meeting' : 'Send email'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
