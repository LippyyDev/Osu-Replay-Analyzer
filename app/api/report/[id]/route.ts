// app/api/report/[id]/route.ts
// GET /api/report/:id — returns a saved report by UUID or slug (public, no auth required)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const db = getSupabaseAdmin();

  // Support both UUID and slug lookup
  const isUuid = UUID_REGEX.test(id);

  const query = db
    .from('reports')
    .select('id, slug, relax_result, relax_warnings, osr_data, filename, player_name, beatmap_title, created_at');

  const { data, error } = await (isUuid
    ? query.eq('id', id)
    : query.eq('slug', id)
  ).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  return NextResponse.json({ report: data });
}
