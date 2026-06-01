import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/user?username=<playerName>
 * Fetches osu! user profile metadata (avatar, banner cover, rank, PP, etc.)
 * Proxied server-side so the client_secret stays safe.
 */
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Missing username parameter' }, { status: 400 });
  }

  // Get token from our own server-side route
  const tokenRes = await fetch(new URL('/api/osu/token', req.url), {
    method: 'POST',
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Failed to get osu! token' }, { status: 500 });
  }
  const { access_token } = await tokenRes.json();

  // Fetch user by username (osu! standard mode = ruleset osu)
  const userRes = await fetch(
    `https://osu.ppy.sh/api/v2/users/${encodeURIComponent(username)}/osu`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!userRes.ok) {
    if (userRes.status === 404) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: `osu! API error: ${userRes.status}` },
      { status: userRes.status }
    );
  }

  const user = await userRes.json();
  return NextResponse.json({
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatar_url ?? null,
    coverUrl: user.cover?.url ?? user.cover_url ?? null,
    globalRank: user.statistics?.global_rank ?? null,
    countryCode: user.country_code ?? '',
    countryName: user.country?.name ?? null,
    countryRank: user.statistics?.country_rank ?? null,
    pp: user.statistics?.pp ?? null,
    playCount: user.statistics?.play_count ?? 0,
    accuracy: user.statistics?.hit_accuracy ?? null,
    level: user.statistics?.level?.current ?? null,
  });
}
