// app/api/forum/posts/[id]/comments/route.ts
// GET  /api/forum/posts/:id/comments — list all comments (nested tree)
// POST /api/forum/posts/:id/comments — add a comment (requires auth)
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';

interface RawComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  users: { username: string; avatar_url: string | null; osu_username: string | null } | null;
}

interface CommentNode extends RawComment {
  children: CommentNode[];
}

function buildTree(comments: RawComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach(c => map.set(c.id, { ...c, children: [] }));

  comments.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });

  return roots;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from('comments')
    .select('*, users(username, avatar_url, osu_username)')
    .eq('post_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tree = buildTree((data ?? []) as RawComment[]);
  return NextResponse.json({ comments: tree });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { body, parent_id } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('comments')
    .insert({
      post_id:   id,
      user_id:   user.sub,
      parent_id: parent_id ?? null,
      body:      body.trim(),
    })
    .select('*, users(username, avatar_url, osu_username)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: { ...data, children: [] } }, { status: 201 });
}
