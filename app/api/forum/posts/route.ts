// app/api/forum/posts/route.ts
// GET  /api/forum/posts?sort=hot|new|top&page=1&limit=20
// POST /api/forum/posts — create a new post (requires auth)
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sort  = searchParams.get('sort') ?? 'new';
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const db = getSupabaseAdmin();

  let query = db
    .from('posts_with_meta')
    .select('*')
    .range(offset, offset + limit - 1);

  if (sort === 'top') {
    query = query.order('upvotes', { ascending: false });
  } else if (sort === 'hot') {
    // Hot = score / time decay; simplified: (upvotes - downvotes) recent posts first
    query = query
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ posts: data, page, limit });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, body: postBody, report_data, report_type } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('posts')
    .insert({
      user_id:     user.sub,
      title:       title.trim(),
      body:        postBody?.trim() ?? null,
      report_data: report_data ?? null,
      report_type: report_type ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data }, { status: 201 });
}
