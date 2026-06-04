// app/api/report/lookup/route.ts
// GET /api/report/lookup?score_id=<online_score_id>
// Returns the existing report ID if a report has been saved for the given score ID,
// or 404 if no report exists. Used to skip re-analysis of already-processed replays.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const scoreId = req.nextUrl.searchParams.get('score_id');

  if (!scoreId || scoreId === '0' || scoreId === '-1' || scoreId === 'null' || scoreId === '') {
    return NextResponse.json({ error: 'Invalid score_id' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('reports')
    .select('id, osr_data')
    .eq('online_score_id', scoreId)
    .maybeSingle();

  if (error) {
    console.error('[report/lookup] DB error:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  // has_csv = true only when osr_data.csvContent is a non-empty string
  const osrData = data.osr_data as Record<string, unknown> | null;
  const hasCsv = typeof osrData?.csvContent === 'string' && (osrData.csvContent as string).length > 0;

  console.log('[report/lookup] Found existing report for score_id:', scoreId, '→', data.id, '| has_csv:', hasCsv);
  return NextResponse.json({ found: true, id: data.id, has_csv: hasCsv }, { status: 200 });
}
