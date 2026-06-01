import { NextResponse } from 'next/server';

/**
 * GET /api/osu/oauth
 * Redirects the user to osu! OAuth authorization page.
 * After authorization, osu! redirects to OSU_REDIRECT_URI (/api/osu/callback).
 */
export async function GET() {
  const clientId    = process.env.OSU_CLIENT_ID;
  const redirectUri = process.env.OSU_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'OAuth not configured (missing OSU_CLIENT_ID or OSU_REDIRECT_URI)' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'public',
  });

  const authUrl = `https://osu.ppy.sh/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
