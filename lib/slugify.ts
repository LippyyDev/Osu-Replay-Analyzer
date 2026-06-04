/**
 * lib/slugify.ts
 *
 * Generates a URL-safe, human-readable slug for a report share link.
 * Example: "ITZKAGUYA" + "Ohara Yuiko - Yume no Tochuu de" → "itzkaguya-ohara-yuiko-yume-no-tochuu-de"
 *
 * Format: <playerName>-<beatmapTitle> (max 80 chars)
 *
 * If a slug collision exists in the DB, a short suffix is appended: -a1b2c3
 */

/** Converts a raw string to a URL-safe slug segment. */
function toSlugPart(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')                          // decompose accents (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '')           // strip combining diacritics
    .replace(/[^a-z0-9\s-]/g, ' ')            // keep only letters/digits/spaces/hyphens
    .trim()
    .replace(/\s+/g, '-')                      // spaces → hyphens
    .replace(/-+/g, '-')                       // collapse multiple hyphens
    .slice(0, 50);                             // cap length per segment
}

/**
 * Generates the base slug from player name and beatmap info.
 * If beatmapTitle includes "artist - title", we use both.
 */
export function generateBaseSlug(
  playerName: string,
  beatmapTitle: string | null
): string {
  const playerPart = toSlugPart(playerName || 'unknown');
  const mapPart    = beatmapTitle ? toSlugPart(beatmapTitle) : '';

  const base = mapPart ? `${playerPart}-${mapPart}` : playerPart;
  return base.slice(0, 80); // hard cap
}

/**
 * Appends a short random suffix to resolve slug collisions.
 * e.g. "itzkaguya-padoru" → "itzkaguya-padoru-a1b2c3"
 */
export function generateSlugWithSuffix(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 8); // 6-char random
  return `${base.slice(0, 72)}-${suffix}`;
}
