import { NextRequest, NextResponse } from 'next/server';
import { getOsuToken } from '@/lib/osuToken';

/**
 * GET /api/osu/download?beatmapId=<id>
 * Downloads the raw .osu beatmap file content for the given beatmap ID.
 * Uses shared token cache — no extra token request if cache is still valid.
 */
export async function GET(req: NextRequest) {
  const beatmapId = req.nextUrl.searchParams.get('beatmapId');
  if (!beatmapId) {
    return NextResponse.json({ error: 'Missing beatmapId' }, { status: 400 });
  }

  let access_token: string;
  try {
    access_token = await getOsuToken();
  } catch (err) {
    console.error('[download] Token error:', err);
    return NextResponse.json({ error: 'Failed to get osu! token' }, { status: 500 });
  }

  // Download the .osu file content
  const downloadRes = await fetch(
    `https://osu.ppy.sh/osu/${beatmapId}`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
    }
  );

  if (!downloadRes.ok) {
    return NextResponse.json(
      { error: `Download failed: ${downloadRes.status}` },
      { status: downloadRes.status }
    );
  }

  const content = await downloadRes.text();
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
