import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { CITIES, PRIMARY_SOURCES, addDays, countUpcomingEventsWithin, platformStats } from '../src/index.js';
import { D, EVENTS, TODAY, V, seed } from './seed.js';

const db = env.DB;
const upcoming = EVENTS.filter((e) => !e.deleted && e.date >= TODAY);
const isPrimary = (source: string | undefined) => (PRIMARY_SOURCES as readonly string[]).includes(source ?? 'scraper_cloudflare');

beforeAll(async () => {
  await seed(db);
});

describe('platformStats', () => {
  it('counts the upcoming catalogue and splits primary calendars from partner APIs', async () => {
    const s = await platformStats(db);
    expect(s.today).toBe(TODAY);
    expect(s.upcomingEvents).toBe(upcoming.length);
    expect(s.upcomingNext30).toBe(upcoming.filter((e) => e.date < addDays(TODAY, 30)).length);
    expect(s.primaryEvents + s.partnerEvents).toBe(s.upcomingEvents);
    expect(s.primaryEvents).toBe(upcoming.filter((e) => isPrimary(e.source)).length);
    // The fixture's ticketmaster/seatgeek rows are the partner side.
    expect(s.partnerEvents).toBe(upcoming.filter((e) => !isPrimary(e.source)).length);
    expect(s.partnerEvents).toBeGreaterThan(0);
    expect(s.primaryPct).toBe(Math.round((s.primaryEvents / s.upcomingEvents) * 100));

    expect(s.metrosCovered).toBe(CITIES.length);
    expect(s.metrosLive).toBe(new Set(upcoming.map((e) => e.city)).size);
    expect(s.eventsByCity.get('Boston')).toBe(upcoming.filter((e) => e.city === 'Boston').length);
    expect([...s.eventsByCity.values()].reduce((a, b) => a + b, 0)).toBe(s.upcomingEvents);
    // venuesLive counts ACTIVE venues only; the fixture's closed club still has
    // upcoming rows but must not be counted.
    expect(s.venuesLive).toBe(new Set(upcoming.filter((e) => e.venue !== V.closed).map((e) => e.venue)).size);
    expect(s.venuesTracked).toBeGreaterThanOrEqual(s.venuesLive);

    expect(s.authorEvents).toBe(upcoming.filter((e) => (e.author_ids ?? []).length > 0).length);
    const pdxAuthors = upcoming.filter((e) => e.city === 'Portland ME' && (e.author_ids ?? []).length > 0).length;
    expect(s.authorEventsByCity.get('Portland ME')).toBe(pdxAuthors);
    expect(pdxAuthors).toBeGreaterThan(0);
    // Cities with no author events are absent rather than zero-valued.
    expect(s.authorEventsByCity.has('Boston')).toBe(false);
    expect(s.authors).toBeGreaterThanOrEqual(3);
    expect(s.books).toBeGreaterThanOrEqual(2);
  });

  it('ignores past and deleted rows entirely', async () => {
    const s = await platformStats(db);
    const excluded = EVENTS.filter((e) => e.deleted || e.date < TODAY);
    expect(excluded.length).toBeGreaterThan(0);
    expect(s.upcomingEvents).toBe(EVENTS.length - excluded.length);
  });

  it('counts an event only as author+book when BOTH are linked', async () => {
    const before = await platformStats(db);
    expect(before.authorAndBookEvents).toBe(
      upcoming.filter((e) => (e.author_ids ?? []).length > 0 && (e.book_ids ?? []).length > 0).length,
    );
    await db
      .prepare(
        `INSERT INTO events (id, venue_id, city, source, title, event_date, author_ids, book_ids)
         VALUES ('aaaaaaaa-0000-4000-8000-0000000000ff', ?1, 'Providence', 'scraper_static', 'Both Linked', ?2, '["ada-debut"]', '["9780306406157"]')`,
      )
      .bind(V.athenaeum, D(4))
      .run();
    const after = await platformStats(db);
    expect(after.authorAndBookEvents).toBe(before.authorAndBookEvents + 1);
    expect(after.authorEvents).toBe(before.authorEvents + 1);
    expect(after.primaryEvents).toBe(before.primaryEvents + 1);
  });
});

describe('countUpcomingEventsWithin', () => {
  it('counts one metro inside the window, excluding past and deleted rows', async () => {
    const window30 = upcoming.filter((e) => e.city === 'Boston' && e.date < addDays(TODAY, 30)).length;
    expect(await countUpcomingEventsWithin(db, 'Boston', 30)).toBe(window30);
    expect(await countUpcomingEventsWithin(db, 'Boston', 0)).toBe(0);
    expect(await countUpcomingEventsWithin(db, 'Nowhere', 30)).toBe(0);
  });
});
