import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/download?beatmapId=<id>
 * Downloads the raw .osu beatmap file content for the given beatmap ID.
 * Returns the raw UTF-8 text of the .osu file.
 */
export async function GET(req: NextRequest) {
  const beatmapId = req.nextUrl.searchParams.get('beatmapId');
  if (!beatmapId) {
    return NextResponse.json({ error: 'Missing beatmapId' }, { status: 400 });
  }

  // Get a token first
  const tokenRes = await fetch(new URL('/api/osu/token', req.url), {
    method: 'POST',
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Failed to get osu! token' }, { status: 500 });
  }
  const { access_token } = await tokenRes.json();

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
