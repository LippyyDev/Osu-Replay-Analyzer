import { NextResponse } from 'next/server';

/**
 * POST /api/osu/logout
 * Clears the osu! OAuth session cookies.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('osu_user_token',   '', { maxAge: 0, path: '/' });
  response.cookies.set('osu_user_session', '', { maxAge: 0, path: '/' });
  return response;
}
