import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/beatmap?md5=<beatmapMd5>
 * Looks up a beatmap by its MD5 hash and returns the download URL + metadata.
 * Fetches a fresh token from our own /api/osu/token route on each call.
 */
export async function GET(req: NextRequest) {
  const md5 = req.nextUrl.searchParams.get('md5');
  if (!md5) {
    return NextResponse.json({ error: 'Missing md5 parameter' }, { status: 400 });
  }

  // Get token from our own server-side route
  const tokenRes = await fetch(new URL('/api/osu/token', req.url), {
    method: 'POST',
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Failed to get osu! token' }, { status: 500 });
  }
  const { access_token } = await tokenRes.json();

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
    beatmapId: beatmap.id,
    beatmapSetId: beatmap.beatmapset_id,
    title: beatmap.beatmapset?.title ?? 'Unknown',
    artist: beatmap.beatmapset?.artist ?? 'Unknown',
    version: beatmap.version,
    od: beatmap.accuracy,
    ar: beatmap.ar,
    cs: beatmap.cs,
    bpm: beatmap.bpm,
    starRating: beatmap.difficulty_rating,
  });
}
