import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/osu/callback?code=<authorization_code>
 *
 * Exchanges the OAuth authorization code for a user access token.
 * Stores the token in an HttpOnly cookie (osu_user_token) and redirects to /steal.
 *
 * The token expires in 24h (osu! default is 86400 seconds).
 * We also store the expiry in a separate readable cookie for client-side checks.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/steal?error=no_code', req.url));
  }

  const clientId     = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;
  const redirectUri  = process.env.OSU_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/steal?error=config', req.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('[callback] Token exchange failed:', tokenRes.status);
      return NextResponse.redirect(new URL('/steal?error=token_failed', req.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token, expires_in } = tokenData;

    // Fetch user profile to confirm the token works and store username
    const meRes = await fetch('https://osu.ppy.sh/api/v2/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept:        'application/json',
      },
    });

    const maxAge = expires_in ?? 86400;
    const response = NextResponse.redirect(new URL('/steal', req.url));

    // HttpOnly secure cookie — not accessible from JS
    response.cookies.set('osu_user_token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    if (meRes.ok) {
      const me = await meRes.json();
      // Readable cookie for client-side display (username + avatar only, not token)
      const sessionData = JSON.stringify({
        userId:    me.id,
        username:  me.username,
        avatarUrl: me.avatar_url ?? null,
      });
      response.cookies.set('osu_user_session', sessionData, {
        httpOnly: false, // readable by client JS
        sameSite: 'lax',
        maxAge,
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('[callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/steal?error=unknown', req.url));
  }
}
