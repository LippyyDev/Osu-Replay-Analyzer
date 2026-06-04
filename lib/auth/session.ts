// lib/auth/session.ts
// Utilities to sign and verify the unified forum session JWT (via jose)
import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
  sub: string;          // Supabase user UUID
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  osu_id: string | null;
  google_uid: string | null;
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const ALG    = 'HS256';
const COOKIE = 'forum_session';

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE as SESSION_COOKIE };
