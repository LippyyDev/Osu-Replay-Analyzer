// app/api/auth/google/route.ts
// POST /api/auth/google — verifies Firebase Google ID token, upserts Supabase user, sets session cookie
import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleIdToken } from '@/lib/firebase/admin';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { signSession, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: 'No idToken' }, { status: 400 });

    // Verify with Firebase Admin
    const decoded = await verifyGoogleIdToken(idToken);

    const db = getSupabaseAdmin();

    // Upsert user by google_uid
    const { data: existing } = await db
      .from('users')
      .select('*')
      .eq('google_uid', decoded.uid)
      .maybeSingle();

    let userId: string;
    let username: string;
    let avatarUrl: string | null;
    let isAdmin: boolean;

    if (existing) {
      // Update Google info in case it changed
      await db.from('users').update({
        google_email:        decoded.email ?? existing.google_email,
        google_display_name: decoded.name  ?? existing.google_display_name,
        google_photo_url:    decoded.picture ?? existing.google_photo_url,
        avatar_url: existing.osu_avatar_url ?? decoded.picture ?? existing.avatar_url,
        username:   existing.osu_username   ?? decoded.name    ?? existing.username,
      }).eq('id', existing.id);

      userId    = existing.id;
      username  = existing.osu_username ?? decoded.name ?? existing.username ?? 'User';
      avatarUrl = existing.osu_avatar_url ?? decoded.picture ?? null;
      isAdmin   = existing.is_admin;
    } else {
      const { data: newUser, error } = await db
        .from('users')
        .insert({
          google_uid:          decoded.uid,
          google_email:        decoded.email ?? null,
          google_display_name: decoded.name  ?? null,
          google_photo_url:    decoded.picture ?? null,
          username:            decoded.name ?? decoded.email?.split('@')[0] ?? 'User',
          avatar_url:          decoded.picture ?? null,
        })
        .select()
        .single();

      if (error || !newUser) {
        console.error('[auth/google] Insert failed:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }

      userId    = newUser.id;
      username  = newUser.username;
      avatarUrl = newUser.avatar_url;
      isAdmin   = newUser.is_admin;
    }

    const token = await signSession({
      sub:        userId,
      username,
      avatar_url: avatarUrl,
      is_admin:   isAdmin,
      osu_id:     existing?.osu_id ?? null,
      google_uid: decoded.uid,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (err) {
    console.error('[auth/google] Error:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }
}
