import { NextRequest, NextResponse } from 'next/server';
import { getOsuToken } from '@/lib/osuToken';

/**
 * GET /api/osu/beatmap?md5=<beatmapMd5>
 * Looks up a beatmap by its MD5 hash and returns metadata.
 * Uses shared token cache — no extra token request if cache is still valid.
 */
export async function GET(req: NextRequest) {
  const md5 = req.nextUrl.searchParams.get('md5');
  if (!md5) {
    return NextResponse.json({ error: 'Missing md5 parameter' }, { status: 400 });
  }

  let access_token: string;
  try {
    access_token = await getOsuToken();
  } catch (err) {
    console.error('[beatmap] Token error:', err);
    return NextResponse.json({ error: 'Failed to get osu! token' }, { status: 500 });
  }

  // Lookup beatmap by MD5
  const beatmapRes = await fetch(
    `https://osu.ppy.sh/api/v2/beatmaps/lookup?checksum=${md5}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!beatmapRes.ok) {
    if (beatmapRes.status === 404) {
      return NextResponse.json({ error: 'Beatmap not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: `osu! API error: ${beatmapRes.status}` },
      { status: beatmapRes.status }
    );
  }

  const beatmap = await beatmapRes.json();
  return NextResponse.json({
    beatmapId:    beatmap.id,
    beatmapSetId: beatmap.beatmapset_id,
    title:        beatmap.beatmapset?.title ?? 'Unknown',
    artist:       beatmap.beatmapset?.artist ?? 'Unknown',
    version:      beatmap.version,
    od:           beatmap.accuracy,
    ar:           beatmap.ar,
    cs:           beatmap.cs,
    bpm:          beatmap.bpm,
    starRating:   beatmap.difficulty_rating,
  });
}
