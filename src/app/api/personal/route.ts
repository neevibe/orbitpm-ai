import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/api-auth';

/**
 * Personal Workspace API (Phase 2) — private per-user projects, custom tables
 * and diary entries.
 *
 * Unlike the org register, this route talks to Postgres with the CALLER'S OWN
 * token on an anon-key client, so Row-Level Security is the enforcement:
 * every query is automatically limited to `user_id = auth.uid()`. Not even
 * admins can read someone else's workspace through this route.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

function callerClient(request: NextRequest) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: request.headers.get('authorization') || '' } },
  });
}

const missingTables = (msg?: string) =>
  !!msg && msg.toLowerCase().includes('does not exist');

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const db = callerClient(request);
  try {
    const [projects, tables, diary] = await Promise.all([
      db.from('personal_projects').select('*').order('updated_at', { ascending: false }),
      db.from('custom_tables').select('*').order('updated_at', { ascending: false }),
      db.from('diary_entries').select('*').order('entry_date', { ascending: false }).limit(200),
    ]);
    const firstError = projects.error || tables.error || diary.error;
    if (firstError) {
      if (missingTables(firstError.message)) {
        return NextResponse.json({ configured: false, projects: [], tables: [], diary: [] });
      }
      throw firstError;
    }
    return NextResponse.json({
      configured: true,
      projects: projects.data ?? [],
      tables: tables.data ?? [],
      diary: diary.data ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const db = callerClient(request);
  const userId = auth.user.id;

  try {
    const body = await request.json();
    const { resource, action, id, data } = body as {
      resource: 'project' | 'table' | 'diary';
      action: 'create' | 'update' | 'delete';
      id?: string;
      data?: Record<string, unknown>;
    };

    const TABLE: Record<string, string> = {
      project: 'personal_projects',
      table: 'custom_tables',
      diary: 'diary_entries',
    };
    const table = TABLE[resource];
    if (!table || !action) {
      return NextResponse.json({ error: 'Invalid resource or action.' }, { status: 400 });
    }

    // user_id always comes from the VERIFIED token — never from the body —
    // and RLS re-checks it on every statement anyway.
    if (action === 'create') {
      const row = { ...(data || {}), user_id: userId, updated_at: new Date().toISOString() };
      const q = resource === 'diary'
        ? db.from(table).upsert(row, { onConflict: 'user_id,entry_date' }).select().single()
        : db.from(table).insert(row).select().single();
      const { data: created, error } = await q;
      if (error) {
        if (missingTables(error.message)) return NextResponse.json({ configured: false }, { status: 503 });
        throw error;
      }
      return NextResponse.json({ ok: true, row: created });
    }

    if (action === 'update') {
      if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
      const { data: updated, error } = await db
        .from(table)
        .update({ ...(data || {}), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, row: updated });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
