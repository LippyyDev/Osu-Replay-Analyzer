import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/leaderboard?beatmapId=<id>&limit=100
 *
 * Fetches the top scores for a beatmap from osu! API v2.
 * Uses CLIENT CREDENTIALS (no user login needed) since this is public data.
 *
 * osu! returns max 50 scores per request, so we batch 2 requests for 100 scores.
 * Returns: LeaderboardScore[]
 */
export async function GET(req: NextRequest) {
  const beatmapId = req.nextUrl.searchParams.get('beatmapId');
  const limit     = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10), 100);

  if (!beatmapId) {
    return NextResponse.json({ error: 'Missing beatmapId' }, { status: 400 });
  }

  // Get client credentials token
  const tokenRes = await fetch(new URL('/api/osu/token', req.url), {
    method: 'POST',
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Failed to get osu! token' }, { status: 500 });
  }
  const { access_token } = await tokenRes.json();

  const headers = {
    Authorization: `Bearer ${access_token}`,
    Accept: 'application/json',
  };

  // Fetch scores in batches of 50
  const batchSize = 50;
  const batches   = Math.ceil(limit / batchSize);
  const allScores: unknown[] = [];

  for (let i = 0; i < batches; i++) {
    const offset = i * batchSize;
    const fetchLimit = Math.min(batchSize, limit - offset);

    const scoresRes = await fetch(
      `https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}/scores?limit=${fetchLimit}&offset=${offset}&mode=osu`,
      { headers }
    );

    if (!scoresRes.ok) {
      // Partial data is OK — return what we have
      break;
    }

    const data = await scoresRes.json();
    const scores = data.scores ?? [];
    allScores.push(...scores);

    if (scores.length < fetchLimit) break; // ran out of scores
  }

  // Map to our LeaderboardScore shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (allScores as any[]).map((s: any) => ({
    scoreId:   s.id,
    userId:    s.user_id,
    username:  s.user?.username ?? 'Unknown',
    score:     s.score ?? s.total_score ?? 0,
    accuracy:  Math.round((s.accuracy ?? 0) * 10000) / 100, // as percentage
    maxCombo:  s.max_combo ?? 0,
    mods:      modsToInt(s.mods ?? []),
    pp:        s.pp ?? null,
    rank:      s.rank ?? 'F',
    createdAt: s.created_at ?? '',
  }));

  return NextResponse.json(mapped);
}

/**
 * Converts osu! API v2 mods array (strings like ["HD","DT"]) to bitmask integer.
 * Handles both v1 (number) and v2 (string array) formats.
 */
function modsToInt(mods: string[] | number): number {
  if (typeof mods === 'number') return mods;
  const MOD_MAP: Record<string, number> = {
    NF: 1, EZ: 2, TD: 4, HD: 8, HR: 16, SD: 32, DT: 64, RX: 128,
    HT: 256, NC: 512, FL: 1024, AT: 2048, SO: 4096, AP: 8192,
    PF: 16384, '4K': 32768, '5K': 65536, '6K': 131072, '7K': 262144,
    '8K': 524288, FI: 1048576, RD: 2097152, CN: 4194304, TG: 8388608,
    '9K': 16777216, KC: 33554432, '1K': 67108864, '3K': 134217728,
    '2K': 268435456, V2: 536870912, MR: 1073741824,
  };
  return mods.reduce((bits, mod) => bits | (MOD_MAP[mod] ?? 0), 0);
}
