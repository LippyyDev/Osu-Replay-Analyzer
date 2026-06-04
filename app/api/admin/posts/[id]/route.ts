// app/api/admin/posts/[id]/route.ts
// DELETE /api/admin/posts/:id — admin delete any post
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getSupabaseAdmin();
  const { error } = await db.from('posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
