// Catalogue-scale aggregates for the platform landing page. Same discipline as
// queries.ts: SELECT only, all SQL lives here, no caller builds SQL.
//
// The landing page is edge-cached for an hour, so these may scan index ranges a
// per-request query never would — but only two statements, in one batch:
//   1. ONE pass over the upcoming-events index, grouped by (source, city). That
//      single scan yields the totals, the 30-day window, the primary/partner
//      split, the author/book counts, the per-metro counts and the live metro
//      count (~78k rows read on prod).
//   2. The small counts — venues, authors, books — as scalar subselects, using
//      EXISTS rather than a DISTINCT join (36k rows read instead of 147k).
import type { D1Database } from '@cloudflare/workers-types';
import { CITIES } from './cities.js';
import { addDays, todayIn } from './dates.js';

/** Aggregates aren't city-scoped, so "today" uses one fixed zone (as sitemaps do). */
const DEFAULT_TZ = 'America/New_York';

/**
 * `events.source` values that mean the listing came from the venue's own
 * calendar: the three scrape routes plus `recurring` (schedules we researched
 * from the venue's own page and materialise ourselves).
 *
 * Everything else arrived through a third-party API — a ticketing marketplace
 * (`ticketmaster`, `stubhub`, `seatgeek`, `dice`, `ovationtix`) or a platform
 * feed (`nps`, `bookmanager`). Classify on the EVENT's source, not the venue's
 * `source_type`: a venue can be scraped today and still hold rows ingested from
 * an API earlier, and the row's own column is the one that tells the truth.
 */
export const PRIMARY_SOURCES = ['scraper_cloudflare', 'scraper_static', 'scraper_local', 'recurring'] as const;
const PRIMARY = new Set<string>(PRIMARY_SOURCES);

export interface PlatformStats {
  /** The day the counts were taken (America/New_York). */
  today: string;
  /** Upcoming, non-deleted events across every metro. */
  upcomingEvents: number;
  /** Of those, the ones inside the next 30 days. */
  upcomingNext30: number;
  /** Active venues we track (including ones with nothing on right now). */
  venuesTracked: number;
  /** Active venues with at least one upcoming event. */
  venuesLive: number;
  /** Metros with at least one upcoming event. */
  metrosLive: number;
  /** Metros in the canonical city list. */
  metrosCovered: number;
  /** Upcoming events from a venue's own calendar (see PRIMARY_SOURCES). */
  primaryEvents: number;
  /** Upcoming events that arrived through a partner/ticketing API. */
  partnerEvents: number;
  /** primaryEvents as a whole-number percentage of upcoming events. */
  primaryPct: number;
  /** Upcoming events with at least one author linked. */
  authorEvents: number;
  /** Upcoming events with BOTH an author and a book linked. */
  authorAndBookEvents: number;
  /** Rows in the author gazetteer. */
  authors: number;
  /** Rows in the book gazetteer. */
  books: number;
  /** City.name -> upcoming event count (the coverage table). */
  eventsByCity: Map<string, number>;
  /** City.name -> upcoming events with an author linked. */
  authorEventsByCity: Map<string, number>;
}

interface GroupRow {
  source: string;
  city: string;
  n: number;
  n30: number;
  authors: number;
  both: number;
}

interface CountRow {
  venues_tracked: number;
  venues_live: number;
  authors: number;
  books: number;
}

/** One aggregate pass over the catalogue, for the platform landing page. */
export async function platformStats(db: D1Database): Promise<PlatformStats> {
  const today = todayIn(DEFAULT_TZ);
  const in30 = addDays(today, 30);
  const batched = await db.batch<GroupRow | CountRow>([
    db
      .prepare(
        `SELECT source, city,
                COUNT(*) AS n,
                SUM(CASE WHEN event_date < ?2 THEN 1 ELSE 0 END) AS n30,
                SUM(CASE WHEN author_ids <> '[]' THEN 1 ELSE 0 END) AS authors,
                SUM(CASE WHEN author_ids <> '[]' AND book_ids <> '[]' THEN 1 ELSE 0 END) AS both
           FROM events
          WHERE is_deleted = 0 AND event_date >= ?1
          GROUP BY source, city`,
      )
      .bind(today, in30),
    db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM venues WHERE is_active = 1) AS venues_tracked,
                (SELECT COUNT(*) FROM venues v WHERE v.is_active = 1 AND EXISTS (
                   SELECT 1 FROM events e
                    WHERE e.venue_id = v.id AND e.is_deleted = 0 AND e.event_date >= ?1
                 )) AS venues_live,
                (SELECT COUNT(*) FROM authors) AS authors,
                (SELECT COUNT(*) FROM books) AS books`,
      )
      .bind(today),
  ]);

  const rows = (batched[0]?.results ?? []) as GroupRow[];
  const c = (batched[1]?.results?.[0] ?? { venues_tracked: 0, venues_live: 0, authors: 0, books: 0 }) as CountRow;
  const stats: PlatformStats = {
    today,
    upcomingEvents: 0,
    upcomingNext30: 0,
    venuesTracked: c.venues_tracked,
    venuesLive: c.venues_live,
    metrosLive: 0,
    metrosCovered: CITIES.length,
    primaryEvents: 0,
    partnerEvents: 0,
    primaryPct: 0,
    authorEvents: 0,
    authorAndBookEvents: 0,
    authors: c.authors,
    books: c.books,
    eventsByCity: new Map(),
    authorEventsByCity: new Map(),
  };
  for (const r of rows) {
    stats.upcomingEvents += r.n;
    stats.upcomingNext30 += r.n30;
    stats.authorEvents += r.authors;
    stats.authorAndBookEvents += r.both;
    if (PRIMARY.has(r.source)) stats.primaryEvents += r.n;
    else stats.partnerEvents += r.n;
    stats.eventsByCity.set(r.city, (stats.eventsByCity.get(r.city) ?? 0) + r.n);
    if (r.authors) stats.authorEventsByCity.set(r.city, (stats.authorEventsByCity.get(r.city) ?? 0) + r.authors);
  }
  stats.metrosLive = stats.eventsByCity.size;
  stats.primaryPct = stats.upcomingEvents ? Math.round((stats.primaryEvents / stats.upcomingEvents) * 100) : 0;
  return stats;
}

/**
 * Upcoming events in one metro inside the next `days` days — the number in the
 * city page's one-line subhead ("2.4k+ things to do in Boston this month").
 * `today` resolves in the city's own zone, like the rest of the city page.
 */
export async function countUpcomingEventsWithin(
  db: D1Database,
  cityName: string,
  days = 30,
  tz = DEFAULT_TZ,
  now: Date = new Date(),
): Promise<number> {
  const from = todayIn(tz, now);
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM events
        WHERE city = ?1 AND is_deleted = 0 AND event_date >= ?2 AND event_date < ?3`,
    )
    .bind(cityName, from, addDays(from, days))
    .first<{ n: number }>();
  return row?.n ?? 0;
}
