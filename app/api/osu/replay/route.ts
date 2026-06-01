import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/replay?scoreId=<id>
 *
 * Downloads the .osr binary for a specific score from osu! API.
 * REQUIRES the user to be logged in (reads osu_user_token HttpOnly cookie).
 * Client credentials do NOT work for this endpoint — user OAuth is mandatory.
 *
 * Tries two endpoint formats:
 *   1. /scores/osu/{id}/download  — classic/stable scores (leaderboard IDs)
 *   2. /scores/{id}/download      — lazer scores
 *
 * NOTE: HTTP 404 almost always means the player did NOT enable
 * "Save replay to server" in their osu! client — the .osr file simply
 * doesn't exist on osu! servers. This is a player-side setting, not an API bug.
 *
 * Returns the raw binary data as application/octet-stream.
 */
export async function GET(req: NextRequest) {
  const scoreId = req.nextUrl.searchParams.get('scoreId');
  if (!scoreId) {
    return NextResponse.json({ error: 'Missing scoreId' }, { status: 400 });
  }

  // Read user token from HttpOnly cookie
  const userToken = req.cookies.get('osu_user_token')?.value;
  if (!userToken) {
    return NextResponse.json(
      { error: 'Not authenticated. Please login with osu! to use Auto Mode.' },
      { status: 401 }
    );
  }

  const authHeaders = {
    Authorization: `Bearer ${userToken}`,
    Accept: 'application/octet-stream',
  };

  // Try classic/stable score endpoint first (leaderboard scores use classic IDs),
  // then fall back to the newer endpoint format.
  const urls = [
    `https://osu.ppy.sh/api/v2/scores/osu/${scoreId}/download`,
    `https://osu.ppy.sh/api/v2/scores/${scoreId}/download`,
  ];

  let lastStatus = 404;

  for (const url of urls) {
    const replayRes = await fetch(url, { headers: authHeaders });

    if (replayRes.ok) {
      const buffer = await replayRes.arrayBuffer();

      // Sanity check: a valid .osr must be at least 20 bytes
      if (buffer.byteLength < 20) {
        continue; // not a real replay file, try next URL
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': buffer.byteLength.toString(),
          // Cache for 10 minutes — replays don't change
          'Cache-Control': 'private, max-age=600',
        },
      });
    }

    if (replayRes.status === 401) {
      return NextResponse.json(
        { error: 'Token expired. Please re-login with osu!.' },
        { status: 401 }
      );
    }

    lastStatus = replayRes.status;
  }

  // Both URLs failed
  if (lastStatus === 404) {
    return NextResponse.json(
      { error: 'Replay tidak tersedia (player tidak menyimpan replay ke server osu!)' },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { error: `osu! API error: ${lastStatus}` },
    { status: lastStatus }
  );
}
