// Presentation helpers (pure). Date/time formatting comes from
// @findlocal/shared/dates so the site never builds a local Date from a
// calendar day.
import { type AuthorRow, type BookRow, type Performer, addDays, leadPerformer, openLibraryCover, roleLabel, categoryBySlug, formatEventDate, formatTime, todayIn, type EventRow } from '@findlocal/shared';
import { categoryArtUrl } from './categoryArt.js';
import { imageAttribution, photoAttribution } from './enrichment.js';

/** 'Free' | the source's price text | '$12' | ''. Mirrors the old EventCard. */
export function priceLabel(e: Pick<EventRow, 'price' | 'price_amount'>): string {
  if (e.price_amount === 0) return 'Free';
  if (e.price) return e.price.trim();
  if (e.price_amount != null && e.price_amount > 0) {
    return Number.isInteger(e.price_amount) ? `$${e.price_amount}` : `$${e.price_amount.toFixed(2)}`;
  }
  return '';
}

/** priceLabel(e), truncated for tight card pills: word-boundary cut before
 * `max` chars (never shorter than 6), plus an ellipsis. Used by the card
 * pill; the event detail page keeps the full label. */
export function shortPriceLabel(e: Pick<EventRow, 'price' | 'price_amount'>, max = 14): string {
  const full = priceLabel(e);
  if (full.length <= max) return full;
  const cut = full.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${sp >= 6 ? cut.slice(0, sp) : cut.slice(0, 6)}…`;
}

/** Category display label for a slug (falls back to the raw value). */
export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return '';
  return categoryBySlug(slug)?.label ?? slug;
}

/** Card date line: 'FRI · SEP 4 · 7:30 PM' (uppercase via CSS). */
export function cardDateLabel(e: Pick<EventRow, 'event_date' | 'start_time'>, tz: string): string {
  const day = formatEventDate(e.event_date, tz, { weekday: 'short', month: 'short', day: 'numeric' }).replace(', ', ' · ');
  const t = formatTime(e.start_time);
  return t ? `${day} · ${t}` : day;
}

/** Day header in a list: 'Today · Friday, September 4' / 'Saturday, September 5'. */
export function dayHeader(ymd: string, tz: string, now: Date = new Date()): string {
  const long = formatEventDate(ymd, tz, { weekday: 'long', month: 'long', day: 'numeric' });
  const today = todayIn(tz, now);
  if (ymd === today) return `Today · ${long}`;
  if (ymd === addDays(today, 1)) return `Tomorrow · ${long}`;
  return long;
}

/** Long single-event date: 'Friday, September 4, 2026'. */
export function longDate(ymd: string, tz: string): string {
  return formatEventDate(ymd, tz, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Short date for titles / meta: 'Sep 4, 2026'. */
export function shortDate(ymd: string, tz: string): string {
  return formatEventDate(ymd, tz, { month: 'short', day: 'numeric', year: 'numeric' });
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

/** Strip tags/entities and collapse whitespace (source descriptions are often
 * HTML fragments). Ported from the old Pages Functions' cleanMetaDescription. */
export function cleanText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16) || 32))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10) || 32))
    .replace(/&([a-z]+);/gi, (m: string, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Single-line, whitespace-collapsed, truncated at a word boundary. */
export function truncate(text: string, max = 160): string {
  const one = text.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${sp > max * 0.6 ? cut.slice(0, sp) : cut}…`;
}

/** Image fallback chain from the plan: own image → series sibling → venue image → placeholder (null). */
export function eventImage(e: Pick<EventRow, 'image_url' | 'series_image' | 'venue_image'>): string | null {
  return e.image_url || e.series_image || e.venue_image || null;
}

// ------------------------------------------------------------------ image chain
//
// Nothing renders the old "teal gradient + category label" placeholder any more:
// when an event has no photo we show the hand-drawn category poster art
// (web/public/art/<slug>.svg, see lib/categoryArt.ts) with no text on top.
// `isArt` lets a caller treat it differently (no attribution, no "photo" framing),
// and `src` is never null so every call site is a plain <img>.

export type ImageKind = 'event' | 'series' | 'venue' | 'book' | 'author' | 'art';

export interface ImagePick {
  /** Always a real URL or site path — never null. */
  src: string;
  /** true when `src` is the category poster art (no real image exists). */
  isArt: boolean;
  kind: ImageKind;
  /** Alt text. '' for decorative photos/art; descriptive for covers and portraits. */
  alt: string;
  /** Credit line to print under the image (Wikimedia licensing), or null. */
  attribution: string | null;
  /** Covers and portraits should not be cropped (`object-fit: contain`). */
  contain: boolean;
}

export interface ImageChainOpts {
  /** OpenLibrary size for book covers / author photos ('M' for cards, 'L' for heroes). */
  coverSize?: 'S' | 'M' | 'L';
  /** The venue row (or anything carrying `image_attribution`) behind `venue_image`. */
  venue?: unknown;
}

function art(category: string | null | undefined): ImagePick {
  return { src: categoryArtUrl(category), isArt: true, kind: 'art', alt: '', attribution: null, contain: false };
}

type ImageEvent = Pick<EventRow, 'image_url' | 'series_image' | 'venue_image' | 'category'>;

/**
 * Event image with a guaranteed result: own image → series sibling → venue image
 * → category art. Replaces `eventImage(e) ?? <placeholder>` at every call site.
 */
export function eventImageOrArt(e: ImageEvent, opts: ImageChainOpts = {}): ImagePick {
  if (e.image_url) return { src: e.image_url, isArt: false, kind: 'event', alt: '', attribution: null, contain: false };
  if (e.series_image) return { src: e.series_image, isArt: false, kind: 'series', alt: '', attribution: null, contain: false };
  if (e.venue_image) {
    return { src: e.venue_image, isArt: false, kind: 'venue', alt: '', attribution: imageAttribution(opts.venue), contain: false };
  }
  return art(e.category);
}

/**
 * Literary chain (owner feedback): book cover → author photo → event image →
 * venue image → category art. Used for events that have `author_ids`/`book_ids`,
 * where the book being discussed is the most recognisable image we have.
 *
 * `books`/`authors` default to the rows the query layer attached to the event.
 */
export function literaryImage(
  e: ImageEvent & { books?: BookRow[]; authors?: AuthorRow[] },
  books: BookRow[] | undefined = e.books,
  authors: AuthorRow[] | undefined = e.authors,
  opts: ImageChainOpts = {},
): ImagePick {
  const size = opts.coverSize ?? 'L';
  const cover = (books ?? []).find((b) => b.cover_url);
  if (cover?.cover_url) {
    return {
      src: openLibraryCover(cover.cover_url, size) ?? cover.cover_url,
      isArt: false, kind: 'book', alt: `Cover of ${cover.title}`, attribution: null, contain: true,
    };
  }
  const portrait = (authors ?? []).find((a) => a.photo_url);
  if (portrait?.photo_url) {
    return {
      src: openLibraryCover(portrait.photo_url, size) ?? portrait.photo_url,
      isArt: false, kind: 'author', alt: portrait.canonical_name, attribution: photoAttribution(portrait), contain: true,
    };
  }
  return eventImageOrArt(e, opts);
}

/** true when an event is worth running through `literaryImage` (it has gazetteer links). */
export function hasLiteraryLinks(e: Pick<EventRow, 'author_ids' | 'book_ids'>): boolean {
  return (e.author_ids?.length ?? 0) > 0 || (e.book_ids?.length ?? 0) > 0;
}

/** The chain an event card / hero should use: literary when linked, plain otherwise. */
export function bestEventImage(
  e: ImageEvent & Pick<EventRow, 'author_ids' | 'book_ids'> & { books?: BookRow[]; authors?: AuthorRow[] },
  opts: ImageChainOpts = {},
): ImagePick {
  return hasLiteraryLinks(e) ? literaryImage(e, e.books, e.authors, opts) : eventImageOrArt(e, opts);
}

/** Outbound link for tickets / details. */
export function eventLink(e: Pick<EventRow, 'ticket_page_url' | 'detail_page_url' | 'root_url' | 'venue_url'>): { href: string; label: string } | null {
  if (e.ticket_page_url) return { href: e.ticket_page_url, label: 'Buy tickets' };
  const href = e.detail_page_url || e.root_url || e.venue_url;
  return href ? { href, label: 'Visit event page' } : null;
}

/** "Featuring A, B and C" / "Author: Ann Patchett" / "Instructor: …" — one line for the event page. */
export function performersLabel(performers: Performer[]): string {
  if (!performers.length) return '';
  const names = performers.slice(0, 6).map((p) => p.name);
  const more = performers.length > 6 ? ` +${performers.length - 6} more` : '';
  const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]!;
  const roles = new Set(performers.map((p) => p.role));
  const single = roles.size === 1 ? [...roles][0] : undefined;
  const prefix: Record<string, string> = { author: 'Author', instructor: 'Instructor', speaker: 'Speaker', host: 'Host', comedian: 'Comedian', dj: 'DJ' };
  if (single && prefix[single]) return `${prefix[single]}${names.length > 1 ? 's' : ''}: ${joined}${more}`;
  return `Featuring ${joined}${more}`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Headline count, always rounded DOWN so the claim stays true: 2,423 -> '2.4k+',
 * 2,000 -> '2k+', 640 -> '640+'. Negatives and fractions clamp to '0+'. */
export function approxCount(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (v < 1000) return `${v}+`;
  const k = Math.floor(v / 100) / 10;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k+`;
}

/** One card line: "Esperanza Spalding" for the bill, "Author: Ann Patchett" for non-performance roles. '' when unknown. */
export function leadPerformerLine(performers: Performer[]): string {
  const lead = leadPerformer(performers);
  if (!lead) return '';
  const prefixed = new Set(['author', 'instructor', 'speaker', 'host']);
  const extra = performers.length > 1 ? ` +${performers.length - 1}` : '';
  return prefixed.has(lead.role) ? `${roleLabel(lead.role)}: ${lead.name}${extra}` : `${lead.name}${extra}`;
}
