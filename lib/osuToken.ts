/**
 * lib/osuToken.ts
 *
 * Server-side in-memory cache for osu! Client Credentials token.
 * The token is valid for 24 hours (86400s) from osu! API.
 * We refresh it 5 minutes before expiry to avoid race conditions.
 *
 * This module is a singleton — imported once per Next.js server process,
 * so all API routes share the same cached token instead of each
 * requesting a new one on every call.
 *
 * Usage:
 *   import { getOsuToken } from '@/lib/osuToken';
 *   const token = await getOsuToken();
 */

// ── In-memory cache ───────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

/** Module-level singleton — survives across requests in the same process. */
let cache: TokenCache | null = null;

/** Refresh 5 minutes before actual expiry */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ── Public helper ─────────────────────────────────────────────────────────────

/**
 * Returns a valid osu! access token.
 * Uses the cached token if still fresh; fetches a new one otherwise.
 */
export async function getOsuToken(): Promise<string> {
  const now = Date.now();

  if (cache && now < cache.expiresAt - REFRESH_BUFFER_MS) {
    // Cache hit — token still valid
    return cache.token;
  }

  // Cache miss or about to expire — fetch a fresh token
  return fetchFreshToken();
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function fetchFreshToken(): Promise<string> {
  const clientId     = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('osu! API credentials not configured (OSU_CLIENT_ID / OSU_CLIENT_SECRET)');
  }

  const res = await fetch('https://osu.ppy.sh/oauth/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id:     parseInt(clientId, 10),
      client_secret: clientSecret,
      grant_type:    'client_credentials',
      scope:         'public',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`osu! token request failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };

  // Store in cache
  cache = {
    token:     data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log(
    '[osuToken] Fetched new token — valid for',
    Math.round(data.expires_in / 3600),
    'hours'
  );

  return cache.token;
}
