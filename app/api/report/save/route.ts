// app/api/report/save/route.ts
// POST /api/report/save — saves a relax analysis snapshot and returns a shareable UUID + slug.
// If the replay has a known online_score_id, returns the EXISTING report instead of inserting a duplicate.
// If existing report lacks csvContent, UPGRADES it in-place.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/getUser';
import { generateBaseSlug, generateSlugWithSuffix } from '@/lib/slugify';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { relax_result, relax_warnings, osr_data, filename, online_score_id } = body;

    if (!relax_result) {
      return NextResponse.json({ error: 'relax_result is required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // ── Deduplication: if a real score ID is provided, check for existing report ──
    const hasRealScoreId =
      online_score_id &&
      online_score_id !== '0' &&
      online_score_id !== '-1' &&
      online_score_id !== 'null' &&
      online_score_id !== '';

    if (hasRealScoreId) {
      const { data: existing } = await db
        .from('reports')
        .select('id, slug, osr_data')
        .eq('online_score_id', online_score_id)
        .maybeSingle();

      if (existing?.id) {
        // Check if the existing report already has csvContent stored
        const existingOsrData = existing.osr_data as Record<string, unknown> | null;
        const existingHasCsv =
          typeof existingOsrData?.csvContent === 'string' &&
          (existingOsrData.csvContent as string).length > 0;

        if (existingHasCsv) {
          // Already complete — return existing ID without DB write
          console.log('[report/save] Returning complete existing report:', online_score_id, '→', existing.id, 'slug:', existing.slug);
          return NextResponse.json({ id: existing.id, slug: existing.slug, existing: true }, { status: 200 });
        }

        // Existing report is missing csvContent — UPDATE it with full data
        console.log('[report/save] Upgrading existing report (missing csvContent):', online_score_id, '→', existing.id);
        const { error: updateError } = await db
          .from('reports')
          .update({
            relax_result,
            relax_warnings:  relax_warnings ?? [],
            osr_data:        osr_data ?? null,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('[report/save] Update error:', updateError);
          // Fall through to insert a new record instead
        } else {
          return NextResponse.json({ id: existing.id, slug: existing.slug, existing: true, upgraded: true }, { status: 200 });
        }
      }
    }

    // ── Extract display fields ────────────────────────────────────────────────
    const playerName   = osr_data?.replayInfo?.playerName ?? null;
    const beatmapTitle = osr_data?.beatmapInfo?.title
      ? `${osr_data.beatmapInfo.artist} - ${osr_data.beatmapInfo.title}`
      : null;

    // ── Generate a unique slug ────────────────────────────────────────────────
    const baseSlug = generateBaseSlug(playerName ?? filename ?? 'replay', beatmapTitle);

    // Try base slug first, then add suffix on collision
    let slug = baseSlug;
    let slugAttempts = 0;
    while (slugAttempts < 5) {
      const { data: slugConflict } = await db
        .from('reports')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!slugConflict) break; // slug is available
      slug = generateSlugWithSuffix(baseSlug);
      slugAttempts++;
    }

    // Get current user (optional — reports can be created anonymously)
    const user = await getUser();
    const userId = user?.sub ?? null;

    // ── Insert new report ─────────────────────────────────────────────────────
    const { data, error } = await db
      .from('reports')
      .insert({
        user_id:         userId,
        relax_result,
        relax_warnings:  relax_warnings ?? [],
        osr_data:        osr_data ?? null,
        filename:        filename ?? null,
        player_name:     playerName,
        beatmap_title:   beatmapTitle,
        online_score_id: hasRealScoreId ? online_score_id : null,
        slug,
      })
      .select('id, slug')
      .single();

    if (error || !data) {
      console.error('[report/save] DB error:', error);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    console.log('[report/save] Saved new report:', data.id, 'slug:', data.slug);
    return NextResponse.json({ id: data.id, slug: data.slug, existing: false }, { status: 201 });
  } catch (err) {
    console.error('[report/save] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
