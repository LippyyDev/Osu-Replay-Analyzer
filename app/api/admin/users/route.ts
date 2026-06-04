// app/api/admin/users/route.ts
// GET   /api/admin/users?page=1&limit=50 — list all users
// PATCH /api/admin/users — toggle admin flag
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getSupabaseAdmin();
  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data, error } = await db
    .from('users')
    .select('id, username, avatar_url, osu_username, google_email, is_admin, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, is_admin } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getSupabaseAdmin();
  await db.from('users').update({ is_admin: Boolean(is_admin) }).eq('id', userId);
  return NextResponse.json({ ok: true });
}
