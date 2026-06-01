import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/osu/token
 * Exchanges osu! Client Credentials for an access token.
 * Credentials live in .env.local and are never exposed to the browser.
 */
export async function POST(_req: NextRequest) {
  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'osu! API credentials not configured on server' },
      { status: 500 }
    );
  }

  const res = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: parseInt(clientId, 10),
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `osu! token request failed: ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({ access_token: data.access_token });
}
