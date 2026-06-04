import { NextResponse } from 'next/server';
import { getOsuToken } from '@/lib/osuToken';

/**
 * POST /api/osu/token
 * Returns a valid osu! access token.
 * Uses shared in-memory cache — only contacts osu!.ppy.sh when token
 * is missing or about to expire. Token is valid for ~24 hours.
 */
export async function POST() {
  try {
    const access_token = await getOsuToken();
    return NextResponse.json({ access_token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[token] Error:', message);
    return NextResponse.json(
      { error: `osu! token request failed: ${message}` },
      { status: 500 }
    );
  }
}
