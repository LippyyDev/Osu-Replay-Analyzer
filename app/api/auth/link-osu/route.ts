// app/api/auth/link-osu/route.ts
// POST /api/auth/link-osu
// Links an osu! account to an existing Google-authenticated user (or creates a new user if osu-first login)
// Body: { osu_id, osu_username, osu_avatar_url, access_token }
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/getUser';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { osu_id, osu_username, osu_avatar_url } = body;

    if (!osu_id || !osu_username) {
      return NextResponse.json({ error: 'Missing osu fields' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const currentUser = await getUser();

    let userId: string;
    let isAdmin: boolean;
    let googleUid: string | null;

    if (currentUser) {
      // Already logged in (Google session) — link osu to this account
      await db.from('users').update({
        osu_id,
        osu_username,
        osu_avatar_url,
        // Prefer osu avatar as primary
        avatar_url: osu_avatar_url ?? undefined,
        username:   osu_username,
      }).eq('id', currentUser.sub);

      userId    = currentUser.sub;
      isAdmin   = currentUser.is_admin;
      googleUid = currentUser.google_uid;
    } else {
      // Not logged in — check if osu account already exists
      const { data: existing } = await db
        .from('users')
        .select('*')
        .eq('osu_id', String(osu_id))
        .maybeSingle();

      if (existing) {
        await db.from('users').update({
          osu_username,
          osu_avatar_url,
          avatar_url: osu_avatar_url ?? existing.avatar_url,
          username:   osu_username,
        }).eq('id', existing.id);

        userId    = existing.id;
        isAdmin   = existing.is_admin;
        googleUid = existing.google_uid;
      } else {
        const { data: newUser, error } = await db
          .from('users')
          .insert({
            osu_id:        String(osu_id),
            osu_username,
            osu_avatar_url,
            username:      osu_username,
            avatar_url:    osu_avatar_url ?? null,
          })
          .select()
          .single();

        if (error || !newUser) {
          console.error('[link-osu] Insert error:', error);
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        userId    = newUser.id;
        isAdmin   = newUser.is_admin;
        googleUid = null;
      }
    }

    // Re-issue session with osu info
    const token = await signSession({
      sub:        userId,
      username:   osu_username,
      avatar_url: osu_avatar_url ?? currentUser?.avatar_url ?? null,
      is_admin:   isAdmin,
      osu_id:     String(osu_id),
      google_uid: googleUid,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error('[link-osu] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
