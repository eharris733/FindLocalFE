import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  categoryCounts, countUpcomingEvents, getCity, getEvent, getEventsByIds, getVenue, listRegions,
  listSeriesDates, listSitemapEvents, listSitemapVenues, listUpcomingEvents, listUpcomingEventsForVenue,
  listVenues, parseFilters, searchVenuesByName, type EventFilters,
} from '../src/index.js';
import { D, EVENTS, eid, seed, TODAY, V } from './seed.js';

const BOS = getCity('Boston')!;
const db = env.DB;
const bos = (extra: Partial<EventFilters> = {}): EventFilters => ({ city: 'Boston', from: TODAY, ...extra });
const titles = (rows: { title: string }[]) => rows.map((r) => r.title);
const byTitle = (rows: { title: string }[], t: string) => rows.find((r) => r.title === t);
const upcomingBoston = EVENTS.filter((e) => e.city === 'Boston' && !e.deleted && e.date >= TODAY);

beforeAll(async () => {
  await seed(db);
});

describe('listUpcomingEvents', () => {
  it('returns upcoming, non-deleted events for the city in date/time/id order with limit clamp', async () => {
    const rows = await listUpcomingEvents(db, bos({ limit: 1000 }));
    expect(rows.length).toBe(upcomingBoston.length);
    expect(titles(rows)).not.toContain('Past Gig');
    expect(titles(rows)).not.toContain('Deleted Gig');
    expect(titles(rows)).not.toContain('NYC Big Ticket');
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]!, b = rows[i]!;
      expect(a.event_date <= b.event_date).toBe(true);
      if (a.event_date === b.event_date && a.start_time && b.start_time) expect(a.start_time <= b.start_time).toBe(true);
    }
    // null start_time sorts last within its day
    const day1 = rows.filter((r) => r.event_date === D(1));
    expect(day1[day1.length - 1]!.title).toBe('Free Community Night');
    expect((await listUpcomingEvents(db, bos({ limit: 3 }))).length).toBe(3);
    expect((await listUpcomingEvents(db, bos({ limit: 0 }))).length).toBe(1);
  });

  it('joins venue columns and parses event_type JSON', async () => {
    const jazz = byTitle(await listUpcomingEvents(db, bos()), 'Afternoon Jazz')!;
    expect(jazz.venue_name).toBe('The Sinclair');
    expect(jazz.venue_lat).toBeCloseTo(42.373);
    expect(jazz.venue_image).toBe('https://img/sinclair.jpg');
    expect(jazz.event_type).toEqual(['Live Jazz Music']);
    expect(jazz.price_amount).toBe(25);
  });

  it('includeDeleted and paging', async () => {
    const all = await listUpcomingEvents(db, bos({ includeDeleted: true, limit: 500 }));
    expect(titles(all)).toContain('Deleted Gig');
    const p1 = await listUpcomingEvents(db, bos({ limit: 5, offset: 0 }));
    const p2 = await listUpcomingEvents(db, bos({ limit: 5, offset: 5 }));
    expect(p1.map((r) => r.id)).not.toEqual(p2.map((r) => r.id));
    expect(await countUpcomingEvents(db, bos())).toBe(upcomingBoston.length);
  });

  it('date window via parseFilters when=today / tomorrow / explicit date', async () => {
    const today = await listUpcomingEvents(db, parseFilters(new URLSearchParams('when=today'), BOS));
    expect(titles(today)).toEqual(['The Headliners']);
    const tomorrow = await listUpcomingEvents(db, parseFilters(new URLSearchParams('when=tomorrow'), BOS));
    expect(tomorrow.every((r) => r.event_date === D(1))).toBe(true);
    expect(titles(tomorrow)).toContain('Trivia Night');
    const day4 = await listUpcomingEvents(db, parseFilters(new URLSearchParams(`when=${D(4)}`), BOS));
    expect(titles(day4)).toContain('Uncategorised Thing');
    const week = await listUpcomingEvents(db, parseFilters(new URLSearchParams('when=week'), BOS));
    expect(week.every((r) => r.event_date <= D(6))).toBe(true);
    expect(await countUpcomingEvents(db, parseFilters(new URLSearchParams('when=week'), BOS))).toBe(week.length);
  });

  it('category filter (cat=) incl. unknown slugs dropped', async () => {
    const f = parseFilters(new URLSearchParams('cat=comedy,bogus'), BOS);
    expect(f.categories).toEqual(['comedy']);
    const rows = await listUpcomingEvents(db, f);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.category === 'comedy')).toBe(true);
    const multi = await listUpcomingEvents(db, bos({ categories: ['comedy', 'fitness'] }));
    expect(titles(multi)).toContain('Morning Yoga');
    expect(titles(multi)).toContain('Late Show');
  });

  it('free / paid / max price flags', async () => {
    const free = await listUpcomingEvents(db, parseFilters(new URLSearchParams('free=1'), BOS));
    expect(titles(free)).toContain('Trivia Night'); // price 'Free', amount null
    expect(titles(free)).toContain('Free Community Night');
    expect(titles(free)).toContain('Weekend Fest'); // amount 0
    expect(titles(free)).not.toContain('Priced Text Only');
    expect(titles(free)).not.toContain('Uncategorised Thing'); // no price info

    const paid = await listUpcomingEvents(db, parseFilters(new URLSearchParams('paid=1'), BOS));
    expect(titles(paid)).toContain('Priced Text Only');
    expect(titles(paid)).toContain('The Headliners');
    expect(titles(paid)).not.toContain('Trivia Night');
    expect(titles(paid)).not.toContain('Uncategorised Thing');

    const both = await countUpcomingEvents(db, bos({ free: true, paid: true }));
    expect(both).toBe(free.length + paid.length);

    const cheap = await listUpcomingEvents(db, parseFilters(new URLSearchParams('max=15'), BOS));
    expect(titles(cheap)).toContain('Morning Yoga');
    expect(titles(cheap)).toContain('Weekend Fest');
    expect(titles(cheap)).not.toContain('Afternoon Jazz');
    expect(titles(cheap)).not.toContain('Trivia Night'); // null amount excluded
  });

  it('time of day buckets', async () => {
    const morning = await listUpcomingEvents(db, parseFilters(new URLSearchParams('tod=morning'), BOS));
    expect(titles(morning)).toContain('Morning Yoga');
    expect(titles(morning)).not.toContain('Afternoon Jazz');
    const afternoon = await listUpcomingEvents(db, parseFilters(new URLSearchParams('tod=afternoon'), BOS));
    expect(titles(afternoon)).toContain('Afternoon Jazz');
    expect(titles(afternoon)).toContain('Weekend Fest'); // 12:00
    const evening = await listUpcomingEvents(db, parseFilters(new URLSearchParams('tod=evening'), BOS));
    expect(titles(evening)).toContain('Late Show');
    expect(titles(evening)).toContain('After Hours DJ'); // 01:00
    expect(titles(evening)).not.toContain('Morning Yoga');
    expect(titles(evening)).not.toContain('Free Community Night'); // null start_time
    const two = await countUpcomingEvents(db, bos({ timeOfDay: ['morning', 'afternoon'] }));
    expect(two).toBe(morning.length + afternoon.length);
  });

  it('region, text (with LIKE escaping + venue name), venueId, ids', async () => {
    const camb = await listUpcomingEvents(db, parseFilters(new URLSearchParams('region=Cambridge'), BOS));
    expect(camb.every((r) => r.region === 'Cambridge')).toBe(true);
    expect(titles(await listUpcomingEvents(db, bos({ text: 'jazz' })))).toEqual(['Afternoon Jazz']);
    expect(titles(await listUpcomingEvents(db, bos({ text: 'paradise' }))).length).toBeGreaterThan(5);
    expect(titles(await listUpcomingEvents(db, bos({ text: '% Under_' })))).toEqual(['Weird % Under_score']);
    expect(await countUpcomingEvents(db, bos({ text: '_____' }))).toBe(0);
    const venue = await listUpcomingEvents(db, bos({ venueId: V.paradise.toUpperCase() }));
    expect(venue.every((r) => r.venue_id === V.paradise)).toBe(true);
    const ids = await listUpcomingEvents(db, bos({ ids: [eid(9).toUpperCase(), eid(10)] }));
    expect(titles(ids).sort()).toEqual(['Afternoon Jazz', 'Morning Yoga']);
  });

  it('recurrence: series_count / series_image survive filtering', async () => {
    const all = await listUpcomingEvents(db, bos({ limit: 500 }));
    const trivia = all.filter((r) => r.title === 'Trivia Night');
    expect(trivia.length).toBe(8);
    for (const t of trivia) {
      expect(t.series_count).toBe(8);
      expect(t.series_image).toBe('https://img/trivia-2.jpg'); // first non-empty by date
    }
    expect(byTitle(all, 'Morning Yoga')!.series_count).toBe(1);
    expect(byTitle(all, 'Morning Yoga')!.series_image).toBeNull();
    // Two rows on one date -> one series date, not recurring.
    expect(byTitle(all, 'Double Booked')!.series_count).toBe(1);
    // Filtered view (only week 1) still knows the series has 8 dates.
    const week = await listUpcomingEvents(db, parseFilters(new URLSearchParams('when=week&cat=nightlife'), BOS));
    const t = byTitle(week, 'Trivia Night')!;
    expect(t.series_count).toBe(8);
    expect(t.series_image).toBe('https://img/trivia-2.jpg');
    expect(await listSeriesDates(db, V.sinclair, '  TRIVIA night ')).toEqual(Array.from({ length: 8 }, (_, w) => D(1 + w * 7)));
  });
});

describe('getEvent / getEventsByIds', () => {
  it('getEvent includes deleted rows and lowercases the id', async () => {
    const deleted = EVENTS.find((e) => e.title === 'Deleted Gig')!;
    const row = await getEvent(db, deleted.id.toUpperCase());
    expect(row?.title).toBe('Deleted Gig');
    expect(row?.is_deleted).toBe(1);
    expect(row?.venue_name).toBe('Paradise Rock Club');
    expect(await getEvent(db, 'aaaaaaaa-0000-4000-8000-999999999999')).toBeNull();
    const trivia = await getEvent(db, eid(1));
    expect(trivia?.series_count).toBe(8);
    expect(trivia?.series_image).toBe('https://img/trivia-2.jpg');
  });
  it('getEventsByIds chunks >90 ids and sorts by date', async () => {
    const ids = EVENTS.map((e) => e.id);
    const padded = [...ids, ...Array.from({ length: 150 }, (_, i) => `bbbbbbbb-0000-4000-8000-${String(i).padStart(12, '0')}`), ids[0]!.toUpperCase()];
    expect(padded.length).toBeGreaterThan(200);
    const rows = await getEventsByIds(db, padded);
    expect(rows.length).toBe(EVENTS.length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.event_date <= rows[i]!.event_date).toBe(true);
    expect(await getEventsByIds(db, [])).toEqual([]);
  });
});

describe('venues', () => {
  it('listVenues active only, ordered, with optional upcoming counts', async () => {
    const vs = await listVenues(db, { city: 'Boston' });
    expect(vs.map((v) => v.name)).toEqual(['Paradise Rock Club', 'The Sinclair']);
    expect(vs[0]!.upcoming).toBe(0);
    expect(vs[1]!.categories).toEqual(['music', 'nightlife']);
    const withCounts = await listVenues(db, { city: 'Boston', withUpcoming: true });
    expect(withCounts.find((v) => v.id === V.sinclair)!.upcoming).toBe(upcomingBoston.filter((e) => e.venue === V.sinclair).length);
    expect((await listVenues(db, { city: 'Boston', region: 'Allston' })).map((v) => v.name)).toEqual(['Paradise Rock Club']);
  });
  it('getVenue, searchVenuesByName, listUpcomingEventsForVenue', async () => {
    const v = await getVenue(db, V.closed.toUpperCase());
    expect(v?.name).toBe('Closed Club');
    expect(v?.is_active).toBe(0);
    expect(await getVenue(db, 'nope')).toBeNull();
    expect((await searchVenuesByName(db, 'club')).map((x) => x.name)).toEqual(['Paradise Rock Club']);
    expect((await searchVenuesByName(db, 'LOUNGE', 'New York')).map((x) => x.name)).toEqual(['Mercury Lounge']);
    expect((await searchVenuesByName(db, 'lounge', 'Boston')).length).toBe(0);
    const ev = await listUpcomingEventsForVenue(db, V.paradise, 3);
    expect(ev.length).toBe(3);
    expect(ev[0]!.title).toBe('The Headliners');
    expect(titles(await listUpcomingEventsForVenue(db, V.paradise))).not.toContain('Past Gig');
  });
});

describe('aggregates', () => {
  it('listRegions from upcoming events, count desc', async () => {
    const regions = await listRegions(db, 'Boston');
    expect(regions.map((r) => r.region)).toEqual(['Cambridge', 'Allston', 'Somerville']);
    expect(regions[0]!.count).toBe(upcomingBoston.filter((e) => e.region === 'Cambridge').length);
  });
  it('categoryCounts: plain and availability-aware (ignores the category filter)', async () => {
    const plain = await categoryCounts(db, 'Boston');
    const music = plain.find((c) => c.category === 'music')!;
    expect(music.count).toBe(upcomingBoston.filter((e) => e.category === 'music').length);
    expect(plain.find((c) => c.category === null as unknown as string)).toBeUndefined();
    const f = parseFilters(new URLSearchParams('cat=comedy&free=1'), BOS);
    const aware = await categoryCounts(db, 'Boston', f);
    expect(aware.find((c) => c.category === 'nightlife')!.count).toBe(8); // trivia is free
    expect(aware.find((c) => c.category === 'fitness')).toBeUndefined(); // yoga is paid
    expect(aware.find((c) => c.category === 'music')).toBeDefined(); // not restricted to comedy
  });
  it('sitemap projections', async () => {
    const evs = await listSitemapEvents(db);
    const expected = EVENTS.filter((e) => !e.deleted && e.date >= TODAY).length;
    expect(evs.length).toBe(expected);
    expect(evs[0]).toEqual({ id: expect.any(String), updated_at: expect.any(String) });
    const vs = await listSitemapVenues(db);
    expect(vs.map((v) => v.id)).not.toContain(V.closed);
    expect(vs.length).toBe(4);
  });
});
