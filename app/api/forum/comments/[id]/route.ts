// app/api/forum/comments/[id]/route.ts
// DELETE /api/forum/comments/:id — delete own comment (or admin)
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: comment } = await db
    .from('comments')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (comment.user_id !== user.sub && !user.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.from('comments').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
