// app/api/forum/posts/[id]/vote/route.ts
// POST /api/forum/posts/:id/vote — upvote (value=1) or downvote (value=-1)
// Toggles: same value again = remove vote, different value = switch vote
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { value } = await req.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: 'value must be 1 or -1' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Check existing vote
  const { data: existing } = await db
    .from('votes')
    .select('*')
    .eq('user_id', user.sub)
    .eq('post_id', id)
    .maybeSingle();

  if (existing) {
    if (existing.value === value) {
      // Same vote — remove (toggle off)
      await db.from('votes').delete().eq('id', existing.id);
      return NextResponse.json({ voted: null });
    } else {
      // Different vote — switch
      await db.from('votes').update({ value }).eq('id', existing.id);
      return NextResponse.json({ voted: value });
    }
  } else {
    // New vote
    await db.from('votes').insert({ user_id: user.sub, post_id: id, value });
    return NextResponse.json({ voted: value });
  }
}
