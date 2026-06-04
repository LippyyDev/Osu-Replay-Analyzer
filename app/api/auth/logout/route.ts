// app/api/auth/logout/route.ts
// POST /api/auth/logout — clears forum session cookie
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   0,
  });
  // Also clear legacy osu cookie
  res.cookies.set('osu_user_session', '', { maxAge: 0, path: '/' });
  res.cookies.set('osu_user_token',   '', { maxAge: 0, path: '/' });
  return res;
}
