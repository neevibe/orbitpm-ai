import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

/**
 * Automated Teams channel alerts via an incoming webhook (no Azure app
 * registration needed — a channel owner creates the webhook in Teams and a
 * super admin pastes the URL on the Integrations page).
 *
 * sendTeamsAlert() is fire-and-forget like recordAudit(): it must never
 * break the action that triggered it. Every successfully delivered alert is
 * also recorded in audit_log as 'teams.alert_sent', which is what the
 * dashboard activity feed shows — the feed only ever reports alerts that
 * were actually sent.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

export const WEBHOOK_SETTING_KEY = 'teams_alert_webhook_url';

/** Classic Teams incoming webhooks + Power Automate "post a card" workflows. */
export const WEBHOOK_URL_RE = /^https:\/\/[^\s/]+\.(webhook\.office\.com|logic\.azure\.com)(:\d+)?\//i;

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Per-instance cache so a burst of mutations doesn't re-read the setting row.
let cached: { url: string | null; at: number } | null = null;

export async function getAlertWebhookUrl(): Promise<string | null> {
  if (cached && Date.now() - cached.at < 60_000) return cached.url;
  try {
    const { data, error } = await db().from('org_settings').select('value').eq('key', WEBHOOK_SETTING_KEY).maybeSingle();
    if (error) return null; // table missing or unreadable → alerts silently off
    const url = typeof data?.value === 'string' ? data.value : (data?.value as { url?: string })?.url || null;
    cached = { url: url && WEBHOOK_URL_RE.test(url) ? url : null, at: Date.now() };
    return cached.url;
  } catch {
    return null;
  }
}

export function invalidateWebhookCache() {
  cached = null;
}

export type TeamsAlert = {
  title: string;                       // "Project delayed"
  text: string;                        // one-line summary
  facts?: { name: string; value: string }[];
  link?: string;                       // absolute URL back into Xyrenis
  /** for the audit trail entry */
  entityId?: string;
  entityName?: string;
  actorName?: string;
};

/** Payload for classic incoming webhooks (webhook.office.com). */
function messageCard(a: TeamsAlert) {
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: a.title,
    themeColor: '1E40AF',
    title: a.title,
    text: a.text,
    sections: a.facts?.length ? [{ facts: a.facts }] : undefined,
    potentialAction: a.link
      ? [{ '@type': 'OpenUri', name: 'Open in Xyrenis', targets: [{ os: 'default', uri: a.link }] }]
      : undefined,
  };
}

/** Payload for Power Automate workflow webhooks (logic.azure.com). */
function adaptiveCard(a: TeamsAlert) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          { type: 'TextBlock', text: a.title, weight: 'Bolder', size: 'Medium', wrap: true },
          { type: 'TextBlock', text: a.text, wrap: true, spacing: 'Small' },
          ...(a.facts?.length ? [{ type: 'FactSet', facts: a.facts.map(f => ({ title: f.name, value: f.value })) }] : []),
        ],
        actions: a.link ? [{ type: 'Action.OpenUrl', title: 'Open in Xyrenis', url: a.link }] : undefined,
      },
    }],
  };
}

/** Deliver to a specific webhook URL. Returns ok + error detail (for the Test button). */
export async function deliverToWebhook(url: string, alert: TeamsAlert): Promise<{ ok: boolean; detail?: string }> {
  try {
    const payload = /logic\.azure\.com/i.test(url) ? adaptiveCard(alert) : messageCard(alert);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    const body = (await res.text().catch(() => '')).slice(0, 200);
    return { ok: false, detail: `Teams answered HTTP ${res.status}${body ? `: ${body}` : ''}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'network error' };
  }
}

/** Fire-and-forget: send to the configured channel and log it. Never throws. */
export async function sendTeamsAlert(alert: TeamsAlert): Promise<void> {
  try {
    const url = await getAlertWebhookUrl();
    if (!url) return; // alerts not configured — quietly skip
    const res = await deliverToWebhook(url, alert);
    if (res.ok) {
      await recordAudit({
        actor: alert.actorName ? { name: alert.actorName } : undefined,
        action: 'teams.alert_sent',
        module: 'teams',
        entityType: 'project',
        entityId: alert.entityId,
        entityName: alert.entityName,
        newValue: { title: alert.title, text: alert.text },
      });
    }
  } catch {
    // alerts must never break the action that triggered them
  }
}
