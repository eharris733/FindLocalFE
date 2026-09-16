// Wikidata / Wikimedia provenance fields (FindLocalData migration 0013) read
// DEFENSIVELY.
//
// `venues.wikidata_id / wikipedia_url / image_attribution / image_source /
// description_source` and `authors.wikipedia_url / photo_attribution` exist in
// D1, but the shared query layer (shared/src/queries.ts, VENUE_COLS /
// AUTHOR_COLS) may not select them yet, and the columns are sparse even once it
// does. So every accessor here takes `unknown`, returns `null` when the field is
// absent/empty, and the components render nothing rather than an empty caption.
//
// Pure + unit-tested (web/test/enrichment.test.ts) — no D1, no DOM.

/** The optional enrichment columns, as they arrive on a VenueRow / AuthorRow. */
export interface Enrichment {
  wikidata_id?: string | null;
  wikipedia_url?: string | null;
  image_attribution?: string | null;
  image_source?: string | null;
  description_source?: string | null;
  /** authors only */
  photo_attribution?: string | null;
  /** authors only (migration 0010) */
  bio?: string | null;
}

function field(row: unknown, key: keyof Enrichment): string | null {
  if (!row || typeof row !== 'object') return null;
  const v = (row as Record<string, unknown>)[key];
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s || null;
}

/** An `https://<lang>.wikipedia.org/...` article URL, or null. Anything else
 * (http, another host, junk) is dropped — we label the link "Wikipedia", so it
 * must actually go there. */
export function wikipediaUrl(row: unknown): string | null {
  const raw = field(row, 'wikipedia_url');
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && /(^|\.)wikipedia\.org$/i.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Credit line for `venues.image` (CC-BY etc.), collapsed to one line. */
export function imageAttribution(row: unknown): string | null {
  return oneLine(field(row, 'image_attribution'));
}

/** Credit line for `authors.photo_url`. */
export function photoAttribution(row: unknown): string | null {
  return oneLine(field(row, 'photo_attribution'));
}

/** `authors.bio` (OpenLibrary or Wikipedia extract), collapsed to one line. */
export function authorBio(row: unknown): string | null {
  return oneLine(field(row, 'bio'));
}

/** Where a description came from ('wikipedia' | 'llm' | 'manual' | null). */
export function descriptionSource(row: unknown): string | null {
  const v = field(row, 'description_source');
  return v ? v.toLowerCase() : null;
}

/** true when the row's description is a Wikipedia extract, so the UI can credit it. */
export function isWikipediaDescription(row: unknown): boolean {
  return descriptionSource(row) === 'wikipedia';
}

function oneLine(v: string | null): string | null {
  if (!v) return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s || null;
}
