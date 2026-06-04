// app/api/forum/posts/[id]/route.ts
// GET    /api/forum/posts/:id — single post with user vote
// DELETE /api/forum/posts/:id — delete own post (or admin)
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db   = getSupabaseAdmin();
  const user = await getUser();

  const { data: post, error } = await db
    .from('posts_with_meta')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch user's own vote if logged in
  let userVote: number | null = null;
  if (user) {
    const { data: vote } = await db
      .from('votes')
      .select('value')
      .eq('post_id', id)
      .eq('user_id', user.sub)
      .maybeSingle();
    userVote = vote?.value ?? null;
  }

  return NextResponse.json({ post, userVote });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();

  // Fetch post to verify ownership
  const { data: post } = await db.from('posts').select('user_id').eq('id', id).single();
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.user_id !== user.sub && !user.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.from('posts').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
