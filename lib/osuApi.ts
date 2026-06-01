/**
 * osuApi.ts
 *
 * Client-side helpers to call our own API routes that proxy to osu! API.
 * All actual HTTP requests to osu.ppy.sh happen server-side via /api/osu/*.
 */

import { BeatmapInfo, UserProfile } from './types';

/**
 * Looks up a beatmap by its MD5 hash (from .osr header).
 * Calls /api/osu/beatmap which proxies to osu! API v2.
 */
export async function fetchBeatmapByMd5(md5: string): Promise<BeatmapInfo> {
  const res = await fetch(`/api/osu/beatmap?md5=${encodeURIComponent(md5)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `Beatmap not found (${res.status})`);
  }
  return res.json();
}

/**
 * Downloads the raw .osu beatmap file text for a given beatmap ID.
 * Calls /api/osu/download which proxies to osu.ppy.sh/osu/<id>.
 */
export async function downloadBeatmapOsu(beatmapId: number): Promise<string> {
  const res = await fetch(`/api/osu/download?beatmapId=${beatmapId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `Download failed (${res.status})`);
  }
  return res.text();
}

/**
 * Fetches osu! user profile (avatar, cover, rank, PP) by username.
 * Calls /api/osu/user which proxies to osu! API v2.
 * Returns null if user not found or request fails (non-blocking).
 */
export async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/osu/user?username=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
