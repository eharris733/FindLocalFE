// Read-only D1 query helpers shared by every front door (Astro site, its JSON
// API, the MCP worker). D1 has no read-only binding mode — the discipline is
// that ONLY these SELECT helpers ever touch the database from a front door.
// All SQL lives here; JSON columns are parsed in the mappers.
import type { D1Database } from '@cloudflare/workers-types';
import { getCity } from './cities.js';
import { addDays, todayIn } from './dates.js';
import { API_DEFAULT_SORT, type EventFilters, type EventSort, type NearFilter } from './filters.js';
import type { AuthorRow, BookRow, EventRow, Performer, VenueRow } from './types.js';

const MAX_BINDS = 90; // D1 allows 100 bound params per statement; leave headroom.
const MAX_LIMIT = 500;

type RawEvent = Omit<
  EventRow,
  'event_type' | 'performers' | 'author_ids' | 'book_ids' | 'books' | 'authors' | 'series_count' | 'series_image'
> & {
  event_type: string | null;
  performers: string | null;
  author_ids: string | null;
  book_ids: string | null;
  series_count: number | null;
  series_image: string | null;
};

type RawBook = Omit<BookRow, 'author_ids'> & { author_ids: string | null };
type RawVenue = Omit<VenueRow, 'categories' | 'upcoming'> & { categories: string | null; upcoming: number | null };

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** events.performers: [{name, role, ...}]; older rows may hold bare name strings. */
function parsePerformers(raw: string | null): Performer[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const out: Performer[] = [];
    for (const item of v) {
      if (typeof item === 'string' && item.trim()) out.push({ name: item.trim(), role: 'performer' });
      else if (item && typeof item === 'object' && typeof (item as Performer).name === 'string') {
        const p = item as Performer;
        out.push({
          name: p.name,
          role: typeof p.role === 'string' && p.role ? p.role : 'performer',
          ...(p.source_id ? { source_id: p.source_id } : {}),
          ...(p.url ? { url: p.url } : {}),
          ...(p.image ? { image: p.image } : {}),
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function mapEvent(r: RawEvent): EventRow {
  const count = r.series_count ?? 1;
  return {
    ...r,
    event_type: parseJsonArray(r.event_type),
    performers: parsePerformers(r.performers),
    author_ids: parseJsonArray(r.author_ids),
    book_ids: parseJsonArray(r.book_ids),
    series_count: count,
    series_image: count > 1 ? r.series_image || null : null,
  };
}

function mapBook(r: RawBook): BookRow {
  return { ...r, author_ids: parseJsonArray(r.author_ids) };
}

function mapVenue(r: RawVenue): VenueRow {
  return { ...r, categories: parseJsonArray(r.categories), upcoming: r.upcoming ?? 0 };
}

/** LIKE wildcard escaping; pair with `ESCAPE '\'`. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

/** Reference zone for helpers that are not city-scoped (getEvent, sitemaps): the
 * old Pages Functions used America/New_York, so keep the same 'today'. */
export const DEFAULT_TZ = 'America/New_York';

function todayDefault(): string {
  return todayIn(DEFAULT_TZ);
}

function cityToday(city: string): string {
  return todayIn(getCity(city)?.tz ?? DEFAULT_TZ);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------- SQL fragments

const EVENT_COLS = `
  e.id, e.venue_id, e.city, e.region, e.source, e.external_id, e.title, e.description,
  e.event_date, e.start_time, e.end_time, e.category, e.event_type, e.performers, e.author_ids, e.book_ids,
  e.price, e.price_amount,
  e.status, e.detail_page_url, e.ticket_page_url, e.root_url, e.image_url, e.is_deleted,
  e.first_seen_at, e.last_seen_at, e.updated_at,
  v.name AS venue_name, v.address AS venue_address, v.image AS venue_image,
  v.latitude AS venue_lat, v.longitude AS venue_lng, v.url AS venue_url,
  v.type AS venue_type, v.region AS venue_region`;

/** Per-row series info via correlated subqueries (single rows / small sets). Binds: today x2. */
const SERIES_SUBQ = `
  (SELECT COUNT(DISTINCT s.event_date) FROM events s
    WHERE s.venue_id = e.venue_id AND lower(trim(s.title)) = lower(trim(e.title))
      AND s.is_deleted = 0 AND s.event_date >= ?) AS series_count,
  (SELECT s.image_url FROM events s
    WHERE s.venue_id = e.venue_id AND lower(trim(s.title)) = lower(trim(e.title))
      AND s.is_deleted = 0 AND s.event_date >= ? AND s.image_url IS NOT NULL AND s.image_url <> ''
    ORDER BY s.event_date, s.start_time, s.id LIMIT 1) AS series_image`;

/** Series info over the UNFILTERED upcoming set for one city (window functions), so a
 * filtered view still shows the recurring pill. Binds: city, today. */
const SERIES_CTE = `
  WITH days AS (
    SELECT venue_id, lower(trim(title)) AS norm_title, event_date,
           MIN(CASE WHEN image_url IS NOT NULL AND image_url <> '' THEN image_url END) AS img
    FROM events WHERE city = ? AND is_deleted = 0 AND event_date >= ?
    GROUP BY venue_id, norm_title, event_date
  ), series AS (
    SELECT venue_id, norm_title, event_date,
           COUNT(*) OVER w AS series_count,
           FIRST_VALUE(img) OVER (PARTITION BY venue_id, norm_title ORDER BY img IS NULL, event_date) AS series_image
    FROM days WINDOW w AS (PARTITION BY venue_id, norm_title)
  )`;

/** Series info over one venue's upcoming rows (series are per venue by definition). Binds: venueId, today. */
const SERIES_CTE_VENUE = `
  WITH days AS (
    SELECT venue_id, lower(trim(title)) AS norm_title, event_date,
           MIN(CASE WHEN image_url IS NOT NULL AND image_url <> '' THEN image_url END) AS img
    FROM events WHERE venue_id = ? AND is_deleted = 0 AND event_date >= ?
    GROUP BY venue_id, norm_title, event_date
  ), series AS (
    SELECT venue_id, norm_title, event_date,
           COUNT(*) OVER w AS series_count,
           FIRST_VALUE(img) OVER (PARTITION BY venue_id, norm_title ORDER BY img IS NULL, event_date) AS series_image
    FROM days WINDOW w AS (PARTITION BY venue_id, norm_title)
  )`;

const SERIES_JOIN = `LEFT JOIN series sr ON sr.venue_id = e.venue_id
  AND sr.norm_title = lower(trim(e.title)) AND sr.event_date = e.event_date`;

// The trailing five venue columns and the last three author columns are
// provenance (migration 0013 / 0010): where an image or description came from and
// the credit line its license requires. All nullable and sparse — the UI reads
// them through web/src/lib/enrichment.ts, which renders nothing when absent.
const VENUE_COLS = `
  v.id, v.name, v.city, v.region, v.url, v.address, v.description, v.image, v.type,
  v.venue_size, v.categories, v.latitude, v.longitude, v.is_active,
  v.wikidata_id, v.wikipedia_url, v.image_attribution, v.image_source, v.description_source`;

const BOOK_COLS = `id, title, subtitle, isbn13, isbn10, cover_url, description, publisher, pub_year, author_ids`;
const AUTHOR_COLS = `id, canonical_name, photo_url, openlibrary_id, bio, wikipedia_url, photo_attribution`;

/** A books.id that is itself an ISBN-13 (Bookmanager rows store the ISBN as the id, isbn13 NULL). */
const ISBN_ID_SQL = `(length(b.id) = 13 AND b.id NOT GLOB '*[^0-9]*')`;
const BUYABLE_SQL = `(b.isbn13 IS NOT NULL OR ${ISBN_ID_SQL})`;

/** Events with at least one gazetteer author on the bill (string compare: never throws on odd JSON). */
const AUTHORS_SQL = `(e.author_ids <> '[]' AND e.author_ids <> '')`;

/** Categories that also match on the *venue's* categories: a bookstore's storytime
 * is classified `family` by its source tokens but belongs in a literary widget. */
const VENUE_SCOPED_CATEGORIES = new Set(['literary']);

/** `e.category IN (...)`, widened to the venue's categories for VENUE_SCOPED_CATEGORIES. */
function categorySql(cats: string[]): Where {
  const clauses = [`e.category IN (${cats.map(() => '?').join(',')})`];
  const binds: unknown[] = [...cats];
  for (const c of cats.filter((x) => VENUE_SCOPED_CATEGORIES.has(x))) {
    clauses.push(`EXISTS (SELECT 1 FROM json_each(v.categories) vc WHERE vc.value = ?)`);
    binds.push(c);
  }
  return { sql: clauses.length > 1 ? `(${clauses.join(' OR ')})` : clauses[0]!, binds };
}

/** Chronological tie-break, reused by every ordering below. */
const CHRONO = `e.event_date, e.start_time IS NULL, e.start_time, e.id`;
const ORDER = `ORDER BY ${CHRONO}`;

// ------------------------------------------------------- featured ordering (sort=featured)
//
// A cheap relevance score computed entirely in SQLite so paging still happens in
// D1. Every term is a CASE over columns the row already carries; nothing is
// correlated, so the cost over the chronological order is a handful of CASEs per
// candidate row. See docs/PRODUCT_POLISH_2026-09.md for the contract.

/** `events` has no created_at (see shared/data/schema/0001_init.sql): first_seen_at
 * is when the pipeline first saw the event, which is what "new" means here. */
const FRESH_DAYS = 7;
const SOON_DAYS = 7;
const SOONISH_DAYS = 14;

/** +3 for the event's own artwork, +1 when the only image is the venue's (or the
 * event just repeats the venue image). */
const IMAGE_SCORE_SQL = `CASE
    WHEN e.image_url IS NOT NULL AND e.image_url <> '' AND (v.image IS NULL OR e.image_url <> v.image) THEN 3
    WHEN e.image_url IS NOT NULL AND e.image_url <> '' THEN 1
    WHEN v.image IS NOT NULL AND v.image <> '' THEN 1
    ELSE 0 END`;
/** length(NULL) is NULL, so a missing description falls through to ELSE 0. */
const DESCRIPTION_SCORE_SQL = `CASE WHEN length(e.description) >= 200 THEN 2 WHEN length(e.description) >= 60 THEN 1 ELSE 0 END`;
const START_TIME_SCORE_SQL = `CASE WHEN e.start_time IS NOT NULL AND e.start_time <> '' THEN 1 ELSE 0 END`;
const PRICE_SCORE_SQL = `CASE WHEN e.price_amount IS NOT NULL OR (e.price IS NOT NULL AND e.price <> '') THEN 0.5 ELSE 0 END`;
/** Someone is on the bill: a performer/author list, or a gazetteer author link. */
const BILL_SCORE_SQL = `CASE WHEN (e.performers IS NOT NULL AND e.performers NOT IN ('', '[]'))
    OR (e.author_ids IS NOT NULL AND e.author_ids NOT IN ('', '[]')) THEN 1 ELSE 0 END`;
/** The hard rule: a row with no image anywhere AND no description sorts after
 * everything else whatever its score — it has nothing to render. */
const HAS_CONTENT_SQL = `CASE WHEN (e.image_url IS NOT NULL AND e.image_url <> '')
    OR (v.image IS NOT NULL AND v.image <> '')
    OR (e.description IS NOT NULL AND trim(e.description) <> '') THEN 1 ELSE 0 END`;
/** Deterministic tie-breaker in [0, 1.5): four id characters mixed with a
 * per-day seed. SQLite has no md5(); unicode()+substr() is one pass over 4 bytes.
 * The `|| '____'` pad keeps unicode() non-NULL for freakishly short ids. */
const JITTER_SQL = `((unicode(substr(e.id || '____', 1, 1)) * 31
    + unicode(substr(e.id || '____', 2, 1)) * 17
    + unicode(substr(e.id || '____', 3, 1)) * 7
    + unicode(substr(e.id || '____', 4, 1)) * 3 + ?) % 150) / 100.0`;

/** A stable small integer per calendar day — reshuffles ties once a day. */
export function jitterSeed(today: string): number {
  const [y = 0, m = 0, d = 0] = today.split('-').map(Number);
  return ((y * 10000 + m * 100 + d) % 997) * 11;
}

export interface FeaturedOrderOptions {
  /** Reference day ('YYYY-MM-DD'), normally today in the city's zone. */
  today: string;
  /** True when the query is already pinned to a single date: the "starts soon"
   * bonus would then be constant, so it is dropped. */
  singleDay?: boolean;
}

/**
 * `ORDER BY` for sort=featured, with its binds (they follow the WHERE binds).
 * Exported so the map/bounds query and tests use the identical expression.
 */
export function featuredOrder(o: FeaturedOrderOptions): Where {
  const terms = [IMAGE_SCORE_SQL, DESCRIPTION_SCORE_SQL, START_TIME_SCORE_SQL, PRICE_SCORE_SQL, BILL_SCORE_SQL];
  const binds: unknown[] = [];
  if (!o.singleDay) {
    terms.push(`CASE WHEN e.event_date <= ? THEN 2 WHEN e.event_date <= ? THEN 1 ELSE 0 END`);
    binds.push(addDays(o.today, SOON_DAYS), addDays(o.today, SOONISH_DAYS));
  }
  terms.push(`CASE WHEN e.first_seen_at >= ? THEN 1 ELSE 0 END`);
  binds.push(addDays(o.today, -FRESH_DAYS));
  terms.push(JITTER_SQL);
  binds.push(jitterSeed(o.today));
  return { sql: `ORDER BY ${HAS_CONTENT_SQL} DESC, (${terms.join(`\n    + `)}) DESC, ${CHRONO}`, binds };
}

/** Degrees of latitude per km (equirectangular approximation, good to ~0.5%). */
const KM_PER_DEG = 111.045;

function lngScale(lat: number): number {
  return Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
}

/** Bounding box around a `near` filter — the cheap prefilter before distance order. */
function nearWhere(n: NearFilter): Where {
  const dLat = n.radiusKm / KM_PER_DEG;
  const dLng = n.radiusKm / (KM_PER_DEG * lngScale(n.lat));
  return {
    sql: `(v.latitude IS NOT NULL AND v.longitude IS NOT NULL
      AND v.latitude BETWEEN ? AND ? AND v.longitude BETWEEN ? AND ?)`,
    binds: [n.lat - dLat, n.lat + dLat, n.lng - dLng, n.lng + dLng],
  };
}

/** Nearest venue first. Squared, scaled degrees — monotonic in real distance, and
 * no cos()/sqrt() in SQL (D1 does not guarantee the SQLite math extension). */
function nearOrder(n: NearFilter): Where {
  const s = lngScale(n.lat);
  return {
    sql: `ORDER BY ((v.latitude - ?) * (v.latitude - ?)) + (((v.longitude - ?) * ?) * ((v.longitude - ?) * ?)), ${CHRONO}`,
    binds: [n.lat, n.lat, n.lng, s, n.lng, s],
  };
}

/** The ORDER BY for a filter set: `near` (distance) wins, then sort=featured, else chronological. */
function orderFor(f: EventFilters, today: string): Where {
  if (f.near) return nearOrder(f.near);
  if ((f.sort ?? API_DEFAULT_SORT) === 'featured') {
    return featuredOrder({ today, singleDay: !!f.to && f.to === (f.from ?? today) });
  }
  return { sql: ORDER, binds: [] };
}

const TOD_SQL: Record<string, string> = {
  morning: `(CAST(substr(e.start_time,1,2) AS INTEGER) BETWEEN 5 AND 11)`,
  afternoon: `(CAST(substr(e.start_time,1,2) AS INTEGER) BETWEEN 12 AND 16)`,
  evening: `(CAST(substr(e.start_time,1,2) AS INTEGER) >= 17 OR CAST(substr(e.start_time,1,2) AS INTEGER) < 5)`,
};
const FREE_SQL = `(e.price_amount = 0 OR lower(e.price) LIKE '%free%')`;
const PAID_SQL = `(e.price_amount > 0 OR (e.price_amount IS NULL AND e.price IS NOT NULL AND e.price <> '' AND lower(e.price) NOT LIKE '%free%'))`;

/** Substring match on performer *names* only (one bind). Legacy rows hold bare strings, hence the CASE. */
const PERFORMER_NAME_SQL = `EXISTS (SELECT 1 FROM json_each(e.performers) p WHERE (CASE WHEN p.type = 'object' THEN json_extract(p.value, '$.name') ELSE p.value END) LIKE ? ESCAPE '\\')`;

interface Where {
  sql: string;
  binds: unknown[];
}

/** WHERE clause for the upcoming-events filter contract. `skip` drops one filter (chips). */
function buildWhere(f: EventFilters, skip?: keyof EventFilters): Where {
  const where: string[] = [`e.city = ?`];
  const binds: unknown[] = [f.city];
  if (!f.includeDeleted) where.push(`e.is_deleted = 0`);
  where.push(`e.event_date >= ?`);
  binds.push(f.from ?? cityToday(f.city));
  if (f.to) {
    where.push(`e.event_date <= ?`);
    binds.push(f.to);
  }
  if (f.region) {
    where.push(`e.region = ?`);
    binds.push(f.region);
  }
  if (f.categories?.length && skip !== 'categories') {
    const c = categorySql(f.categories.slice(0, MAX_BINDS));
    where.push(c.sql);
    binds.push(...c.binds);
  }
  if (f.authorsOnly) where.push(AUTHORS_SQL);
  if (f.free && f.paid) where.push(`(${FREE_SQL} OR ${PAID_SQL})`);
  else if (f.free) where.push(FREE_SQL);
  else if (f.paid) where.push(PAID_SQL);
  if (f.maxPrice !== undefined) {
    where.push(`e.price_amount <= ?`);
    binds.push(f.maxPrice);
  }
  const tods = (f.timeOfDay ?? []).map((t) => TOD_SQL[t]).filter((s): s is string => !!s);
  if (tods.length) where.push(`(${tods.join(' OR ')})`);
  if (f.text) {
    where.push(`(e.title LIKE ? ESCAPE '\\' OR v.name LIKE ? ESCAPE '\\' OR ${PERFORMER_NAME_SQL})`);
    const like = `%${escapeLike(f.text.trim())}%`;
    binds.push(like, like, like);
  }
  if (f.performer) {
    where.push(PERFORMER_NAME_SQL);
    binds.push(`%${escapeLike(f.performer.trim())}%`);
  }
  if (f.near) {
    const n = nearWhere(f.near);
    where.push(n.sql);
    binds.push(...n.binds);
  }
  if (f.venueId) {
    where.push(`e.venue_id = ?`);
    binds.push(f.venueId.toLowerCase());
  }
  if (f.ids?.length) {
    const ids = f.ids.slice(0, MAX_BINDS).map((id) => id.toLowerCase());
    where.push(`e.id IN (${ids.map(() => '?').join(',')})`);
    binds.push(...ids);
  }
  return { sql: where.join(' AND '), binds };
}

// ---------------------------------------------------------------- events

/**
 * Upcoming events for a city under the filter contract, with recurrence info.
 * Ordering: `f.near` (distance) > `f.sort = 'featured'` > chronological (the
 * default, so the JSON API and MCP are unchanged unless they ask for featured).
 */
export async function listUpcomingEvents(db: D1Database, f: EventFilters): Promise<EventRow[]> {
  const w = buildWhere(f);
  const today = cityToday(f.city);
  const order = orderFor(f, today);
  const limit = Math.min(Math.max(f.limit ?? 100, 1), MAX_LIMIT);
  const offset = Math.max(f.offset ?? 0, 0);
  const sql = `${SERIES_CTE}
    SELECT ${EVENT_COLS}, sr.series_count, sr.series_image
    FROM events e JOIN venues v ON v.id = e.venue_id ${SERIES_JOIN}
    WHERE ${w.sql} ${order.sql} LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(f.city, today, ...w.binds, ...order.binds, limit, offset)
    .all<RawEvent>();
  return results.map(mapEvent);
}

export async function countUpcomingEvents(db: D1Database, f: EventFilters): Promise<number> {
  const w = buildWhere(f);
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM events e JOIN venues v ON v.id = e.venue_id WHERE ${w.sql}`)
    .bind(...w.binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** One event by id, INCLUDING soft-deleted rows (the site renders "no longer listed"). */
export async function getEvent(db: D1Database, id: string): Promise<EventRow | null> {
  const today = todayDefault();
  const row = await db
    .prepare(
      `SELECT ${EVENT_COLS}, ${SERIES_SUBQ} FROM events e JOIN venues v ON v.id = e.venue_id WHERE e.id = ?`,
    )
    .bind(today, today, id.trim().toLowerCase())
    .first<RawEvent>();
  if (!row) return null;
  const event = mapEvent(row);
  // Both are no-ops for non-literary events (empty book_ids / author_ids). The mobile
  // app's image chain (book cover → author photo → …) reads these off /api/events/<id>.
  await Promise.all([attachBooks(db, [event]), attachAuthors(db, [event])]);
  return event;
}

// ---------------------------------------------------------------- literary books

/** Books from the gazetteer by id (books.id = ISBN-13 or a work slug). Chunked to
 * stay under D1's bind cap; ids are matched exactly (not lowercased). */
export async function booksByIds(db: D1Database, ids: string[]): Promise<BookRow[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];
  const out: BookRow[] = [];
  for (const part of chunk(unique, MAX_BINDS)) {
    const sql = `SELECT ${BOOK_COLS} FROM books WHERE id IN (${part.map(() => '?').join(',')})`;
    const { results } = await db.prepare(sql).bind(...part).all<RawBook>();
    out.push(...results.map(mapBook));
  }
  return out;
}

/** Books written by any of the given authors (books.author_ids overlaps), for
 * author-only events with no linked book. Ordered so a real buy link comes first:
 * ISBN-bearing books (isbn13 column or an ISBN-13 id), then newest by pub_year.
 * Chunked over the author ids. */
export async function booksByAuthorIds(db: D1Database, authorIds: string[], limit = 6): Promise<BookRow[]> {
  const unique = [...new Set(authorIds.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];
  const seen = new Set<string>();
  const out: BookRow[] = [];
  for (const part of chunk(unique, MAX_BINDS)) {
    const sql = `SELECT ${BOOK_COLS} FROM books b
      WHERE EXISTS (SELECT 1 FROM json_each(b.author_ids) a WHERE a.value IN (${part.map(() => '?').join(',')}))
      ORDER BY (NOT ${BUYABLE_SQL}), (b.pub_year IS NULL), b.pub_year DESC, b.title`;
    const { results } = await db.prepare(sql).bind(...part).all<RawBook>();
    for (const r of results) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(mapBook(r));
    }
  }
  return out.slice(0, Math.max(limit, 1));
}

/** The most recently published *buyable* (ISBN-13) book per author, for linking an
 * author's name to a credited Bookshop deep link. Covers win ties. Authors with no
 * buyable book are absent from the map. */
export async function latestBooksByAuthors(db: D1Database, authorIds: string[]): Promise<Map<string, BookRow>> {
  const unique = [...new Set(authorIds.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, BookRow>();
  if (!unique.length) return out;
  for (const part of chunk(unique, MAX_BINDS)) {
    const sql = `SELECT ${BOOK_COLS} FROM books b
      WHERE ${BUYABLE_SQL}
        AND EXISTS (SELECT 1 FROM json_each(b.author_ids) a WHERE a.value IN (${part.map(() => '?').join(',')}))
      ORDER BY (b.pub_year IS NULL), b.pub_year DESC, (b.cover_url IS NULL), b.title`;
    const { results } = await db.prepare(sql).bind(...part).all<RawBook>();
    const wanted = new Set(part);
    for (const r of results) {
      const book = mapBook(r);
      for (const a of book.author_ids) if (wanted.has(a) && !out.has(a)) out.set(a, book);
    }
  }
  return out;
}

/** Authors from the gazetteer by id, chunked under the bind cap; ids matched exactly. */
export async function authorsByIds(db: D1Database, ids: string[]): Promise<AuthorRow[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];
  const out: AuthorRow[] = [];
  for (const part of chunk(unique, MAX_BINDS)) {
    const sql = `SELECT ${AUTHOR_COLS} FROM authors WHERE id IN (${part.map(() => '?').join(',')})`;
    const { results } = await db.prepare(sql).bind(...part).all<AuthorRow>();
    out.push(...results);
  }
  return out;
}

/** Resolve every event's author_ids in one batched query and hang `authors` off
 * each event (author_ids order; missing ids dropped). Mutates in place. */
export async function attachAuthors(db: D1Database, events: EventRow[]): Promise<EventRow[]> {
  const ids = [...new Set(events.flatMap((e) => e.author_ids ?? []))];
  if (!ids.length) return events;
  const byId = new Map((await authorsByIds(db, ids)).map((a) => [a.id, a]));
  for (const e of events) {
    const list = (e.author_ids ?? []).map((id) => byId.get(id)).filter((a): a is AuthorRow => !!a);
    if (list.length) e.authors = list;
  }
  return events;
}

/** Resolve every event's book_ids in one batched query and hang `books` off each
 * event (preserving book_ids order; missing ids are dropped). Mutates in place and
 * returns the same array. Cheap no-op when no event has book_ids. */
export async function attachBooks(db: D1Database, events: EventRow[]): Promise<EventRow[]> {
  const ids = [...new Set(events.flatMap((e) => e.book_ids ?? []))];
  if (!ids.length) return events;
  const byId = new Map((await booksByIds(db, ids)).map((b) => [b.id, b]));
  for (const e of events) {
    const list = (e.book_ids ?? []).map((id) => byId.get(id)).filter((b): b is BookRow => !!b);
    if (list.length) e.books = list;
  }
  return events;
}

/** Events by id (any date, deleted included), chunked to stay under D1's bind cap; date order. */
export async function getEventsByIds(db: D1Database, ids: string[]): Promise<EventRow[]> {
  const unique = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return [];
  const today = todayDefault();
  const out: EventRow[] = [];
  for (const part of chunk(unique, MAX_BINDS - 2)) {
    const sql = `SELECT ${EVENT_COLS}, ${SERIES_SUBQ} FROM events e JOIN venues v ON v.id = e.venue_id
      WHERE e.id IN (${part.map(() => '?').join(',')})`;
    const { results } = await db.prepare(sql).bind(today, today, ...part).all<RawEvent>();
    out.push(...results.map(mapEvent));
  }
  return out.sort(compareEvents);
}

function compareEvents(a: EventRow, b: EventRow): number {
  if (a.event_date !== b.event_date) return a.event_date < b.event_date ? -1 : 1;
  const at = a.start_time ?? '￿';
  const bt = b.start_time ?? '￿';
  if (at !== bt) return at < bt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface VenueEventsOptions {
  /** City.name of the venue when the caller already has it (skips a lookup); "today" resolves in its zone. */
  city?: string;
  offset?: number;
}

/** "Today" for a venue: its city's zone (one small lookup unless the caller passes the city). */
async function venueToday(db: D1Database, venueId: string, city?: string): Promise<string> {
  if (city) return cityToday(city);
  const row = await db.prepare(`SELECT city FROM venues WHERE id = ?`).bind(venueId).first<{ city: string | null }>();
  return row?.city ? cityToday(row.city) : todayDefault();
}

/** Upcoming events at one venue with recurrence info, "today" in the venue's city zone. */
export async function listUpcomingEventsForVenue(
  db: D1Database,
  venueId: string,
  limit = 50,
  opts: VenueEventsOptions = {},
): Promise<EventRow[]> {
  const id = venueId.trim().toLowerCase();
  const today = await venueToday(db, id, opts.city);
  const sql = `${SERIES_CTE_VENUE}
    SELECT ${EVENT_COLS}, sr.series_count, sr.series_image
    FROM events e JOIN venues v ON v.id = e.venue_id ${SERIES_JOIN}
    WHERE e.venue_id = ? AND e.is_deleted = 0 AND e.event_date >= ? ${ORDER} LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(id, today, id, today, Math.min(Math.max(limit, 1), MAX_LIMIT), Math.max(opts.offset ?? 0, 0))
    .all<RawEvent>();
  return results.map(mapEvent);
}

/** Upcoming non-deleted events at one venue, "today" in the venue's city zone. */
export async function countUpcomingEventsForVenue(db: D1Database, venueId: string, city?: string): Promise<number> {
  const id = venueId.trim().toLowerCase();
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM events WHERE venue_id = ? AND is_deleted = 0 AND event_date >= ?`)
    .bind(id, await venueToday(db, id, city))
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Distinct upcoming dates for the same normalised title at a venue. */
export async function listSeriesDates(db: D1Database, venueId: string, title: string): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT event_date FROM events WHERE venue_id = ? AND lower(trim(title)) = lower(trim(?))
         AND is_deleted = 0 AND event_date >= ? ORDER BY event_date`,
    )
    .bind(venueId.trim().toLowerCase(), title, todayDefault())
    .all<{ event_date: string }>();
  return results.map((r) => r.event_date);
}

// ---------------------------------------------------------------- multi-city (region groups / embeds)

export interface MultiCityOptions {
  /** City.name values (not slugs). Deduped; capped at MAX_CITIES. */
  cities: string[];
  categories?: string[];
  /** Inclusive 'YYYY-MM-DD'; defaults to today in `tz`. */
  from?: string;
  to?: string | null;
  /** Clamped to 1..MAX_LIMIT. */
  limit?: number;
  /** Zone for the default `from`; region groups pass their own. */
  tz?: string;
  /** Only events with a gazetteer author on the bill (author_ids non-empty). */
  authorsOnly?: boolean;
}

const MAX_CITIES = 60;
const MAX_CATEGORIES = 20;

/** WHERE for the multi-city contract. Binds: cities + [to] + from + categories — always < 90. */
function buildMultiCityWhere(o: MultiCityOptions): Where | null {
  const cities = [...new Set(o.cities.map((c) => c.trim()).filter(Boolean))].slice(0, MAX_CITIES);
  if (!cities.length) return null;
  const where = [`e.city IN (${cities.map(() => '?').join(',')})`, `e.is_deleted = 0`, `e.event_date >= ?`];
  const binds: unknown[] = [...cities, o.from ?? todayIn(o.tz ?? DEFAULT_TZ)];
  if (o.to) {
    where.push(`e.event_date <= ?`);
    binds.push(o.to);
  }
  const cats = [...new Set(o.categories ?? [])].slice(0, MAX_CATEGORIES);
  if (cats.length) {
    const c = categorySql(cats);
    where.push(c.sql);
    binds.push(...c.binds);
  }
  if (o.authorsOnly) where.push(AUTHORS_SQL);
  return { sql: where.join(' AND '), binds };
}

/** Upcoming events across several cities (region-group embeds). No recurrence
 * info: series_count = 1, series_image = null. */
export async function listUpcomingEventsForCities(db: D1Database, o: MultiCityOptions): Promise<EventRow[]> {
  const w = buildMultiCityWhere(o);
  if (!w) return [];
  const limit = Math.min(Math.max(o.limit ?? 100, 1), MAX_LIMIT);
  const sql = `SELECT ${EVENT_COLS}, 1 AS series_count, NULL AS series_image
    FROM events e JOIN venues v ON v.id = e.venue_id WHERE ${w.sql} ${ORDER} LIMIT ?`;
  const { results } = await db.prepare(sql).bind(...w.binds, limit).all<RawEvent>();
  return results.map(mapEvent);
}

export async function countUpcomingEventsForCities(db: D1Database, o: MultiCityOptions): Promise<number> {
  const w = buildMultiCityWhere(o);
  if (!w) return 0;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM events e JOIN venues v ON v.id = e.venue_id WHERE ${w.sql}`)
    .bind(...w.binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// ---------------------------------------------------------------- map (bounding box)

/** Hard cap on rows a single map viewport may return. */
export const MAP_MAX_LIMIT = 400;
export const MAP_DEFAULT_LIMIT = 200;
/** Biggest viewport we will answer: 4° is already ~450 km across. */
export const MAP_MAX_SPAN_DEG = 4;

export interface BoundsBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface MapEventOptions extends BoundsBox {
  /** Inclusive 'YYYY-MM-DD' lower bound; defaults to today in `tz`. */
  from?: string;
  /** Inclusive upper bound; null/undefined = open-ended ("anytime"). */
  to?: string | null;
  categories?: string[];
  free?: boolean;
  paid?: boolean;
  text?: string;
  authorsOnly?: boolean;
  /** Clamped to 1..MAP_MAX_LIMIT (default MAP_DEFAULT_LIMIT). */
  limit?: number;
  /** 'featured' (default here — the map shows the best of a viewport) or 'date'. */
  sort?: EventSort;
  /** Zone for the default `from`; callers pass the nearest city's. */
  tz?: string;
}

/** Compact row for map pins — never the full EventRow (a viewport holds hundreds). */
export interface MapEventRow {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  category: string | null;
  /** Image chain resolved server-side: the event's artwork, else the venue's. */
  image: string | null;
  venue_id: string;
  venue_name: string;
  lat: number;
  lng: number;
  /** Parsed USD amount when the source gave one. */
  price_min: number | null;
  free: boolean;
  /** Path on findlocal.community for this event. */
  path: string;
}

type RawMapEvent = Omit<MapEventRow, 'free' | 'path'> & { is_free: number };

/** True when the box is finite, correctly ordered, in range, and not absurdly large. */
export function isValidBounds(b: BoundsBox, maxSpan = MAP_MAX_SPAN_DEG): boolean {
  const nums = [b.minLat, b.minLng, b.maxLat, b.maxLng];
  if (!nums.every((n) => Number.isFinite(n))) return false;
  if (b.minLat >= b.maxLat || b.minLng >= b.maxLng) return false;
  if (b.minLat < -90 || b.maxLat > 90 || b.minLng < -180 || b.maxLng > 180) return false;
  return b.maxLat - b.minLat <= maxSpan && b.maxLng - b.minLng <= maxSpan;
}

/**
 * Events whose venue falls inside a lat/lng box — the map's own query. NOT city
 * scoped: the viewport is the scope, so a box straddling two metros returns both.
 * `series_image` is deliberately not consulted (there is no city to build the
 * series CTE over); the image chain is event artwork → venue image.
 */
export async function listEventsInBounds(db: D1Database, o: MapEventOptions): Promise<MapEventRow[]> {
  if (!isValidBounds(o)) return [];
  const today = o.from ?? todayIn(o.tz ?? DEFAULT_TZ);
  const where = [
    `e.is_deleted = 0`,
    `e.event_date >= ?`,
    `v.latitude IS NOT NULL AND v.longitude IS NOT NULL`,
    `v.latitude BETWEEN ? AND ?`,
    `v.longitude BETWEEN ? AND ?`,
  ];
  const binds: unknown[] = [today, o.minLat, o.maxLat, o.minLng, o.maxLng];
  if (o.to) {
    where.push(`e.event_date <= ?`);
    binds.push(o.to);
  }
  const cats = [...new Set(o.categories ?? [])].slice(0, MAX_CATEGORIES);
  if (cats.length) {
    const c = categorySql(cats);
    where.push(c.sql);
    binds.push(...c.binds);
  }
  if (o.authorsOnly) where.push(AUTHORS_SQL);
  if (o.free && o.paid) where.push(`(${FREE_SQL} OR ${PAID_SQL})`);
  else if (o.free) where.push(FREE_SQL);
  else if (o.paid) where.push(PAID_SQL);
  const text = o.text?.trim();
  if (text) {
    where.push(`(e.title LIKE ? ESCAPE '\\' OR v.name LIKE ? ESCAPE '\\')`);
    const like = `%${escapeLike(text)}%`;
    binds.push(like, like);
  }
  const order =
    (o.sort ?? 'featured') === 'featured'
      ? featuredOrder({ today, singleDay: !!o.to && o.to === today })
      : { sql: ORDER, binds: [] as unknown[] };
  const sql = `SELECT e.id, e.title, e.event_date, e.start_time, e.category,
      COALESCE(NULLIF(e.image_url, ''), NULLIF(v.image, '')) AS image,
      e.venue_id, v.name AS venue_name, v.latitude AS lat, v.longitude AS lng,
      e.price_amount AS price_min, CASE WHEN ${FREE_SQL} THEN 1 ELSE 0 END AS is_free
    FROM events e JOIN venues v ON v.id = e.venue_id
    WHERE ${where.join(' AND ')} ${order.sql} LIMIT ?`;
  const { results } = await db
    .prepare(sql)
    .bind(...binds, ...order.binds, Math.min(Math.max(o.limit ?? MAP_DEFAULT_LIMIT, 1), MAP_MAX_LIMIT))
    .all<RawMapEvent>();
  return results.map(({ is_free, ...r }) => ({ ...r, free: is_free === 1, path: `/event/${r.id}` }));
}

// ---------------------------------------------------------------- venues

export type VenueSort = 'name' | 'upcoming';

export interface VenueListOptions {
  city: string;
  region?: string;
  /** Populate `upcoming` (count of upcoming non-deleted events) via a correlated subquery. */
  withUpcoming?: boolean;
  /** `name` (default) or `upcoming` (most upcoming first, then name; implies withUpcoming). */
  sort?: VenueSort;
  /** Case-insensitive "name contains". */
  q?: string;
  /** Exact venue type, case-insensitive (see listVenueTypes). */
  type?: string;
}

function upcomingCol(withUpcoming: boolean | undefined): string {
  return withUpcoming
    ? `(SELECT COUNT(*) FROM events e WHERE e.venue_id = v.id AND e.is_deleted = 0 AND e.event_date >= ?) AS upcoming`
    : `0 AS upcoming`;
}

export async function listVenues(db: D1Database, o: VenueListOptions): Promise<VenueRow[]> {
  const withUpcoming = !!o.withUpcoming || o.sort === 'upcoming';
  const binds: unknown[] = [];
  if (withUpcoming) binds.push(cityToday(o.city));
  const where = [`v.is_active = 1`, `v.city = ?`];
  binds.push(o.city);
  if (o.region) {
    where.push(`v.region = ?`);
    binds.push(o.region);
  }
  const q = o.q?.trim();
  if (q) {
    where.push(`v.name LIKE ? ESCAPE '\\'`);
    binds.push(`%${escapeLike(q)}%`);
  }
  const type = o.type?.trim();
  if (type) {
    where.push(`lower(v.type) = lower(?)`);
    binds.push(type);
  }
  const order = o.sort === 'upcoming' ? `ORDER BY upcoming DESC, v.name` : `ORDER BY v.name`;
  const { results } = await db
    .prepare(`SELECT ${VENUE_COLS}, ${upcomingCol(withUpcoming)} FROM venues v WHERE ${where.join(' AND ')} ${order}`)
    .bind(...binds)
    .all<RawVenue>();
  return results.map(mapVenue);
}

/** Distinct venue types in a city (active venues), most common first. */
export async function listVenueTypes(db: D1Database, city: string): Promise<{ type: string; count: number }[]> {
  const { results } = await db
    .prepare(
      `SELECT type, COUNT(*) AS count FROM venues
       WHERE is_active = 1 AND city = ? AND type IS NOT NULL AND type <> ''
       GROUP BY type ORDER BY count DESC, type`,
    )
    .bind(city)
    .all<{ type: string; count: number }>();
  return results;
}

/** One venue by id (active or not), with its upcoming count ("today" in the venue's city zone). */
export async function getVenue(db: D1Database, id: string): Promise<VenueRow | null> {
  const vid = id.trim().toLowerCase();
  const row = await db.prepare(`SELECT ${VENUE_COLS}, NULL AS upcoming FROM venues v WHERE v.id = ?`).bind(vid).first<RawVenue>();
  if (!row) return null;
  const upcoming = await countUpcomingEventsForVenue(db, vid, row.city);
  return mapVenue({ ...row, upcoming });
}

/** Active venues whose name contains `name` (case-insensitive LIKE), optionally within a city. */
export async function searchVenuesByName(db: D1Database, name: string, city?: string, limit = 5): Promise<VenueRow[]> {
  const where = [`v.is_active = 1`, `v.name LIKE ? ESCAPE '\\'`];
  const binds: unknown[] = [`%${escapeLike(name.trim())}%`];
  if (city) {
    where.push(`v.city = ?`);
    binds.push(city);
  }
  const { results } = await db
    .prepare(`SELECT ${VENUE_COLS}, 0 AS upcoming FROM venues v WHERE ${where.join(' AND ')} ORDER BY v.name LIMIT ?`)
    .bind(...binds, Math.min(Math.max(limit, 1), 100))
    .all<RawVenue>();
  return results.map(mapVenue);
}

// ---------------------------------------------------------------- aggregates

/** Regions with upcoming events in a city, most events first. */
export async function listRegions(db: D1Database, city: string): Promise<{ region: string; count: number }[]> {
  const { results } = await db
    .prepare(
      `SELECT region, COUNT(*) AS count FROM events
       WHERE city = ? AND is_deleted = 0 AND event_date >= ? AND region IS NOT NULL AND region <> ''
       GROUP BY region ORDER BY count DESC, region`,
    )
    .bind(city, cityToday(city))
    .all<{ region: string; count: number }>();
  return results;
}

/**
 * Upcoming events per category. With `f`, every filter EXCEPT categories is
 * applied, so a chip can show how many events choosing it would yield.
 */
export async function categoryCounts(
  db: D1Database,
  city: string,
  f?: EventFilters,
): Promise<{ category: string; count: number }[]> {
  const w = buildWhere(f ? { ...f, city } : { city }, 'categories');
  const { results } = await db
    .prepare(
      `SELECT e.category, COUNT(*) AS count FROM events e JOIN venues v ON v.id = e.venue_id
       WHERE ${w.sql} AND e.category IS NOT NULL GROUP BY e.category ORDER BY count DESC, e.category`,
    )
    .bind(...w.binds)
    .all<{ category: string; count: number }>();
  return results;
}

// ---------------------------------------------------------------- sitemaps

export const SITEMAP_HORIZON_DAYS = 180;

/**
 * Event URLs worth submitting: upcoming, not deleted, within `horizonDays`, and
 * only the FIRST upcoming occurrence of each series (same lower(trim(title)) at
 * the same venue) so Google sees one page per recurring event instead of N
 * near-duplicates. Later dates stay crawlable from the event and venue pages.
 * `updated_at` feeds <lastmod>; since FindLocalData PR #28 the pipeline only
 * bumps it when a visible column changes.
 */
export async function listSitemapEvents(db: D1Database, horizonDays = SITEMAP_HORIZON_DAYS): Promise<{ id: string; updated_at: string }[]> {
  const today = todayDefault();
  const { results } = await db
    .prepare(
      `SELECT id, updated_at FROM (
         SELECT id, event_date, updated_at,
                ROW_NUMBER() OVER (PARTITION BY venue_id, lower(trim(title)) ORDER BY event_date, id) AS rn
         FROM events WHERE is_deleted = 0 AND event_date >= ?
       ) WHERE rn = 1 AND event_date <= ? ORDER BY event_date, id`,
    )
    .bind(today, addDays(today, horizonDays))
    .all<{ id: string; updated_at: string }>();
  return results;
}

/** Active venues that currently have at least one upcoming event (an empty venue page reads as a soft 404). */
export async function listSitemapVenues(db: D1Database): Promise<{ id: string; updated_at: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT v.id, v.updated_at FROM venues v WHERE v.is_active = 1
         AND EXISTS (SELECT 1 FROM events e WHERE e.venue_id = v.id AND e.is_deleted = 0 AND e.event_date >= ?)
       ORDER BY v.name, v.id`,
    )
    .bind(todayDefault())
    .all<{ id: string; updated_at: string }>();
  return results;
}

/** Upcoming (non-deleted) event count per city name, for deciding which city pages to submit. */
export async function countUpcomingEventsByCity(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db
    .prepare(`SELECT city, COUNT(*) AS count FROM events WHERE is_deleted = 0 AND event_date >= ? GROUP BY city`)
    .bind(todayDefault())
    .all<{ city: string; count: number }>();
  return new Map(results.map((r) => [r.city, r.count]));
}
