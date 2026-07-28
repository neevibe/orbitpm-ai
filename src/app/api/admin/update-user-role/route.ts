import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Phase 0: privilege changes were previously open to ANY caller.
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  try {
    const { userId, permission, department } = await request.json();

    if (!userId || !permission) {
      return NextResponse.json({ error: 'userId and permission are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      // Graceful degradation — UI update already happened client-side
      return NextResponse.json({ success: true, note: 'Service role key not configured — UI updated locally only' });
    }

    // Update user metadata via Supabase Admin API
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // app_metadata is the authoritative claim store (not user-editable);
        // user_metadata is kept in sync for older UI reads.
        app_metadata: {
          permission,
          ...(department ? { department } : {}),
        },
        user_metadata: {
          permission,
          ...(department ? { department } : {}),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const updated = await res.json();
    return NextResponse.json({ success: true, user: updated });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
