// lib/auth/getUser.ts
// Server-side helper — reads and verifies the forum session cookie
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE, SessionPayload } from './session';

export async function getUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
