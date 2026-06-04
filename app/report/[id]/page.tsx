// app/report/[id]/page.tsx
// Server component — generates Open Graph metadata for social media previews.
// The actual UI is rendered by ReportViewClient (client component).
import type { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import ReportViewClient from './ReportViewClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE_URL   = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// ── Server-side report fetch (for metadata only) ──────────────────────────────

async function fetchReportMeta(id: string) {
  try {
    const db = getSupabaseAdmin();
    const isUuid = UUID_REGEX.test(id);

    const { data } = await db
      .from('reports')
      .select('id, slug, player_name, beatmap_title, osr_data, created_at')
      .eq(isUuid ? 'id' : 'slug', id)
      .single();

    return data ?? null;
  } catch {
    return null;
  }
}

// ── Open Graph metadata ───────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const report  = await fetchReportMeta(id);

  if (!report) {
    return {
      title: 'Report Not Found — osu! Replay Analyzer',
    };
  }

  // Extract beatmap set ID for cover image from osr_data
  const osrData = report.osr_data as Record<string, unknown> | null;
  const beatmapSetId = (osrData?.beatmapInfo as Record<string, unknown> | null)?.beatmapSetId as number | null;
  const verdict      = ((osrData as Record<string, unknown> | null) !== null
    ? (report as unknown as Record<string, Record<string, unknown>>)?.relax_result?.verdict
    : null) as string | null;

  const player    = report.player_name ?? 'Unknown Player';
  const beatmap   = report.beatmap_title ?? 'Unknown Beatmap';
  const title     = `${player} — ${beatmap} | osu! Replay Analysis`;
  const description = verdict
    ? `Verdict: ${verdict} · osu! Replay Analyzer`
    : `Replay analysis for ${player} on ${beatmap}`;

  // Use beatmap cover as OG image (osu! CDN)
  const imageUrl = beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${beatmapSetId}/covers/cover@2x.jpg`
    : `${BASE_URL}/og-default.png`;

  const canonicalUrl = report.slug
    ? `${BASE_URL}/report/${report.slug}`
    : `${BASE_URL}/report/${report.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'osu! Replay Analyzer',
      images: [
        {
          url: imageUrl,
          width: 900,
          height: 250,
          alt: `${player} — ${beatmap}`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ReportPage() {
  // The client component handles all data fetching + UI
  return <ReportViewClient />;
}
