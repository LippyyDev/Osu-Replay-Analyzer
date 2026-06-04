// app/api/auth/me/route.ts
// GET /api/auth/me — returns current user from session cookie
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
