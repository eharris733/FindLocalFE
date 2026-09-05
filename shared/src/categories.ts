// Flat event categories, vendored from FindLocalData/src/data/categories.json.
// slugForToken mirrors FindLocalData/src/categories.py exactly so the front
// doors classify raw event_type tokens the same way the gold pipeline does.
import raw from '../data/categories.json';

export interface Category {
  slug: string;
  label: string;
  tokens: string[];
}

interface CategoriesFile {
  categories: Category[];
  venue_types: Record<string, string>;
  community_map: Record<string, string>;
  ignored_tokens: string[];
}

const data = raw as CategoriesFile;

export const CATEGORIES: Category[] = data.categories;
export const CATEGORY_SLUGS: string[] = CATEGORIES.map((c) => c.slug);
export const IGNORED_TOKENS: Set<string> = new Set(data.ignored_tokens.map((t) => t.toLowerCase()));

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** token (lowercase) -> slug. First category in list order wins on collisions. */
const TOKEN_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const cat of CATEGORIES) {
    for (const tok of cat.tokens) {
      const key = tok.toLowerCase();
      if (!index.has(key)) index.set(key, cat.slug);
    }
  }
  return index;
})();

const VENUE_TYPE_INDEX = new Map(Object.entries(data.venue_types).map(([k, v]) => [k.toLowerCase(), v]));

export function categoryBySlug(slug: string | null | undefined): Category | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug.trim().toLowerCase());
}

/**
 * Map one raw event_type token to a category slug, or null.
 * Rules (= categories.py slug_for_token): trim+lowercase; ignored tokens -> null;
 * exact token match first; else the first indexed token longer than 3 chars
 * that appears inside the input ("Live Jazz Music" -> music).
 */
export function slugForToken(token: unknown): string | null {
  const t = String(token ?? '').trim().toLowerCase();
  if (!t || IGNORED_TOKENS.has(t)) return null;
  const direct = TOKEN_INDEX.get(t);
  if (direct) return direct;
  for (const [tok, slug] of TOKEN_INDEX) {
    if (tok.length > 3 && t.includes(tok)) return slug;
  }
  return null;
}

/** All distinct slugs for a token list, in category order (= slugs_for_tokens). */
export function slugsForTokens(tokens: Iterable<unknown> | null | undefined): string[] {
  const found = new Set<string>();
  for (const tok of tokens ?? []) {
    const slug = slugForToken(tok);
    if (slug) found.add(slug);
  }
  return CATEGORY_SLUGS.filter((s) => found.has(s));
}

/** venues.type (lowercased) -> category slug, from categories.json venue_types. */
export function slugForVenueType(venueType: string | null | undefined): string | null {
  if (!venueType) return null;
  return VENUE_TYPE_INDEX.get(venueType.trim().toLowerCase()) ?? null;
}
