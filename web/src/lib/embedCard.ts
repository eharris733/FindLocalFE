// Card model for the /embed widget rows (pure, unit-tested). Turns an EventRow
// (with books/authors attached) into what a row shows: the thumbnail, the author
// line and the one affiliate buy link. Rendered identically by the server list
// and the client-side calendar day view, so both read the same shape.
import { openLibraryCover, type BookRow, type EventRow } from '@findlocal/shared';
import { buyLink } from './bookshop.js';
import { categoryArtUrl } from './categoryArt.js';

export interface CardAuthor {
  name: string;
  /** Credited Bookshop deep link (the event's book, else the author's latest ISBN book), or null. */
  href: string | null;
}

export interface CardThumb {
  src: string;
  /** 'art' = the category poster art (web/public/art), the last-resort fallback. */
  kind: 'cover' | 'photo' | 'image' | 'art';
  alt: string;
}

export interface EventCard {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  place: string;
  url: string;
  /** Exact-ISBN affiliate link for "Buy the book"; null when no book is buyable. */
  buyUrl: string | null;
  thumb: CardThumb | null;
  authors: CardAuthor[];
}

/** Dedupe key tolerant of punctuation/diacritics: "Vincent. Yu" == "Vincent Yu". */
export function nameKey(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = nameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** First exact (ISBN) buy link among the event's linked books, or null. */
export function eventBuyUrl(e: EventRow): string | null {
  for (const b of e.books ?? []) {
    const l = buyLink(b);
    if (l.exact) return l.href;
  }
  return null;
}

/** The buyable book that best represents an author for this event: the event's own
 * buyable book if any, else the author's latest ISBN book. */
function authorBook(e: EventRow, authorId: string, latest: Map<string, BookRow>): BookRow | null {
  const own = (e.books ?? []).find((b) => buyLink(b).exact);
  if (own) return own;
  const l = latest.get(authorId);
  return l && buyLink(l).exact ? l : null;
}

/** Author line: gazetteer authors (author_ids order) with a credited link when one
 * exists; when nothing is linked, fall back to author-role performers, unlinked. */
export function cardAuthors(e: EventRow, latest: Map<string, BookRow>): CardAuthor[] {
  if (e.authors?.length) {
    const seen = new Set<string>();
    const out: CardAuthor[] = [];
    for (const a of e.authors) {
      const key = nameKey(a.canonical_name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const book = authorBook(e, a.id, latest);
      out.push({ name: a.canonical_name, href: book ? buyLink(book).href : null });
    }
    return out;
  }
  return dedupeNames(e.performers.filter((p) => p.role === 'author').map((p) => p.name)).map((name) => ({ name, href: null }));
}

/** Thumbnail: linked book cover → latest-book cover (it is what the link sells) →
 * author photo → event/venue image → category poster art. OpenLibrary images are
 * sized down. Never null any more (the art file always exists), so rows never fall
 * back to a bare glyph. */
export function cardThumb(e: EventRow, latest: Map<string, BookRow>): CardThumb {
  const own = (e.books ?? []).find((b) => b.cover_url);
  if (own?.cover_url) return { src: openLibraryCover(own.cover_url, 'M')!, kind: 'cover', alt: `Cover of ${own.title}` };
  for (const id of e.author_ids) {
    const b = latest.get(id);
    if (b?.cover_url) return { src: openLibraryCover(b.cover_url, 'M')!, kind: 'cover', alt: `Cover of ${b.title}` };
  }
  const author = (e.authors ?? []).find((a) => a.photo_url);
  if (author?.photo_url) return { src: openLibraryCover(author.photo_url, 'M')!, kind: 'photo', alt: author.canonical_name };
  const img = e.image_url || e.series_image || e.venue_image;
  if (img) return { src: img, kind: 'image', alt: '' };
  return { src: categoryArtUrl(e.category), kind: 'art', alt: '' };
}
