import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';
import { getUser } from '@/lib/auth/getUser';

/**
 * GET /api/osu/callback?code=<authorization_code>
 *
 * Exchanges the OAuth code for an osu! access token, fetches user profile,
 * upserts the user into Supabase, and issues a unified forum session cookie.
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

    // Fetch osu! user profile
    const meRes = await fetch('https://osu.ppy.sh/api/v2/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept:        'application/json',
      },
    });

    const maxAge  = expires_in ?? 86400;
    const response = NextResponse.redirect(new URL('/steal', req.url));

    // Keep the existing HttpOnly token cookie for Steal Checker feature
    response.cookies.set('osu_user_token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    if (meRes.ok) {
      const me = await meRes.json();

      // Keep the legacy readable cookie for Steal Checker backward compat
      const sessionData = JSON.stringify({
        userId:    me.id,
        username:  me.username,
        avatarUrl: me.avatar_url ?? null,
      });
      response.cookies.set('osu_user_session', sessionData, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge,
        path: '/',
      });

      // --- NEW: Upsert into Supabase & issue forum session ---
      try {
        const db = getSupabaseAdmin();

        // Check if current user (Google) is already logged in — link osu to them
        const currentUser = await getUser();

        let userId: string;
        let isAdmin: boolean;
        let googleUid: string | null = null;

        if (currentUser && !currentUser.osu_id) {
          // Link osu to existing Google account
          await db.from('users').update({
            osu_id:        String(me.id),
            osu_username:  me.username,
            osu_avatar_url: me.avatar_url ?? null,
            avatar_url:    me.avatar_url ?? null,
            username:      me.username,
          }).eq('id', currentUser.sub);
          userId    = currentUser.sub;
          isAdmin   = currentUser.is_admin;
          googleUid = currentUser.google_uid;
        } else {
          // Upsert by osu_id
          const { data: existing } = await db
            .from('users')
            .select('*')
            .eq('osu_id', String(me.id))
            .maybeSingle();

          if (existing) {
            await db.from('users').update({
              osu_username:  me.username,
              osu_avatar_url: me.avatar_url ?? null,
              avatar_url:    me.avatar_url ?? existing.avatar_url,
              username:      me.username,
            }).eq('id', existing.id);
            userId    = existing.id;
            isAdmin   = existing.is_admin;
            googleUid = existing.google_uid;
          } else {
            const { data: newUser } = await db
              .from('users')
              .insert({
                osu_id:        String(me.id),
                osu_username:  me.username,
                osu_avatar_url: me.avatar_url ?? null,
                username:      me.username,
                avatar_url:    me.avatar_url ?? null,
              })
              .select()
              .single();

            userId    = newUser!.id;
            isAdmin   = newUser!.is_admin;
          }
        }

        const token = await signSession({
          sub:        userId,
          username:   me.username,
          avatar_url: me.avatar_url ?? null,
          is_admin:   isAdmin,
          osu_id:     String(me.id),
          google_uid: googleUid,
        });

        response.cookies.set(SESSION_COOKIE, token, {
          httpOnly: true,
          sameSite: 'lax',
          path:     '/',
          maxAge:   60 * 60 * 24 * 30,
        });
      } catch (dbErr) {
        // Non-fatal — steal checker still works even if forum session fails
        console.error('[callback] Supabase upsert failed:', dbErr);
      }
    }

    return response;
  } catch (err) {
    console.error('[callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/steal?error=unknown', req.url));
  }
}
