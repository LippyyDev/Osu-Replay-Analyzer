import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/me
 * Returns the currently logged-in osu! user profile.
 * Reads the user access token from the HttpOnly cookie.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('osu_user_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const meRes = await fetch('https://osu.ppy.sh/api/v2/me', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/json',
    },
  });

  if (!meRes.ok) {
    return NextResponse.json(
      { error: `osu! API error: ${meRes.status}` },
      { status: meRes.status }
    );
  }

  const me = await meRes.json();
  return NextResponse.json({
    userId:    me.id,
    username:  me.username,
    avatarUrl: me.avatar_url ?? null,
  });
}
