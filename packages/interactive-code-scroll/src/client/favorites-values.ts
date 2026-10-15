/** Storage key of the favorites: per site `base`, since several series can share an origin (GitHub Pages). */
export function favoritesKey(base: string): string {
  return `ics:favorites:${base}`;
}

/** Stored favorites (a JSON list of slugs), keeping only the tutorials in `known`; anything else is none. */
export function readFavorites(raw: string | null, known: ReadonlySet<string>): string[] {
  if (raw === null) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((slug): slug is string => typeof slug === "string" && known.has(slug)))];
}

/** Adds `slug` to the favorites, or removes it when already there. */
export function toggleFavorite(favorites: readonly string[], slug: string): string[] {
  return favorites.includes(slug) ? favorites.filter((s) => s !== slug) : [...favorites, slug];
}
