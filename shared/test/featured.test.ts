// sort=featured, the `near` proximity filter and listEventsInBounds. The shared
// fixture (seed.ts) has no descriptions and few images, so this file adds its own
// venues/events in beforeAll — vitest-pool-workers isolates storage per file, so
// they are invisible to the other suites.
import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  canonicalQuery,
  countUpcomingEvents,
  filtersToQuery,
  getCity,
  isValidBounds,
  jitterSeed,
  listEventsInBounds,
  listUpcomingEvents,
  parseFilters,
  type EventFilters,
  type MapEventOptions,
} from '../src/index.js';
import { D, seed, TODAY, V } from './seed.js';

const db = env.DB;
const BOS = getCity('Boston')!;
const bos = (extra: Partial<EventFilters> = {}): EventFilters => ({ city: 'Boston', from: TODAY, limit: 500, ...extra });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

// Two extra Boston venues: one with a venue image (the +1 fallback), one without.
const VEN_PLAIN = 'fea70000-0000-4000-8000-000000000001';
const VEN_IMAGE = 'fea70000-0000-4000-8000-000000000002';
const VENUE_IMAGE = 'https://img/feat-venue.jpg';
const LONG_DESC = 'A '.repeat(140); // 280 chars -> the >= 200 tier
const MID_DESC = 'B '.repeat(40); // 80 chars -> the >= 60 tier

interface Fx {
  id: string;
  venue: string;
  title: string;
  date: string;
  time?: string | null;
  description?: string | null;
  image?: string | null;
  price?: string | null;
  priceAmount?: number | null;
  performers?: string;
  firstSeen?: string;
}

const fx = (n: number) => `fea70000-0000-4000-8000-0000000000${String(10 + n).padStart(2, '0')}`;
const FIXTURES: Fx[] = [
  // Everything a card can want: own artwork, long description, time, price, a bill.
  { id: fx(1), venue: VEN_IMAGE, title: 'Featured Rich', date: D(3), time: '19:00', description: LONG_DESC, image: 'https://img/feat-rich.jpg', price: '$20', priceAmount: 20, performers: '[{"name":"Ada Star","role":"headliner"}]' },
  // Same artwork as the venue's: only worth the fallback +1.
  { id: fx(2), venue: VEN_IMAGE, title: 'Featured Dup Image', date: D(3), time: '19:30', image: VENUE_IMAGE },
  // Description only, no image anywhere.
  { id: fx(3), venue: VEN_PLAIN, title: 'Featured Mid Desc', date: D(3), time: '19:00', description: MID_DESC },
  // Nothing to render at all: must sort behind everything.
  { id: fx(4), venue: VEN_PLAIN, title: 'Featured Bare', date: D(3), time: null },
  // No image AND no description, but otherwise a strong row — the hard rule still demotes it.
  { id: fx(5), venue: VEN_PLAIN, title: 'Featured Hollow', date: D(3), time: '20:00', price: '$30', priceAmount: 30, performers: '[{"name":"Rex Void","role":"headliner"}]' },
  // Weakest row that still has something to show (venue image), far out and stale.
  { id: fx(6), venue: VEN_IMAGE, title: 'Featured Thin', date: D(40), time: null, firstSeen: '2020-01-01T00:00:00.000Z' },
];

beforeAll(async () => {
  await seed(db);
  const vs = db.prepare(
    `INSERT INTO venues (id, name, city, region, url, address, image, type, categories, latitude, longitude, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const es = db.prepare(
    `INSERT INTO events (id, venue_id, city, region, source, external_id, title, description, event_date, start_time,
       category, event_type, performers, book_ids, author_ids, price, price_amount, image_url, is_deleted, first_seen_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  await db.batch([
    vs.bind(VEN_PLAIN, 'Feature Test Hall', 'Boston', 'Cambridge', null, '1 Test St', null, 'music venue', '["music"]', 42.3735, -71.1195, 1),
    vs.bind(VEN_IMAGE, 'Feature Test Annex', 'Boston', 'Cambridge', null, '2 Test St', VENUE_IMAGE, 'music venue', '["music"]', 42.3736, -71.1196, 1),
    ...FIXTURES.map((f) =>
      es.bind(f.id, f.venue, 'Boston', 'Cambridge', 'scraper_cloudflare', `fx-${f.id}`, f.title, f.description ?? null,
        f.date, f.time ?? null, 'music', '["music"]', f.performers ?? '[]', '[]', '[]', f.price ?? null,
        f.priceAmount ?? null, f.image ?? null, 0, f.firstSeen ?? '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ),
  ]);
});

/** Nothing to render = no image (own or venue) and no description. */
const hollow = (r: { image_url: string | null; venue_image: string | null; description: string | null }) =>
  !r.image_url && !r.venue_image && !(r.description && r.description.trim());

describe('sort=featured', () => {
  it('returns exactly the same rows as sort=date, only reordered', async () => {
    const featured = await listUpcomingEvents(db, bos({ sort: 'featured' }));
    const dated = await listUpcomingEvents(db, bos({ sort: 'date' }));
    expect(featured.length).toBe(dated.length);
    expect([...ids(featured)].sort()).toEqual([...ids(dated)].sort());
    // The fixture guarantees a different order (a far-future row is ranked up).
    expect(ids(featured)).not.toEqual(ids(dated));
  });

  it('leaves sort=date (and the default) chronological', async () => {
    for (const f of [bos(), bos({ sort: 'date' })]) {
      const rows = await listUpcomingEvents(db, f);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1]!.event_date <= rows[i]!.event_date).toBe(true);
      }
    }
  });

  it('puts the richest row first and rows with no image and no description last', async () => {
    const rows = await listUpcomingEvents(db, bos({ sort: 'featured' }));
    expect(rows[0]!.title).toBe('Featured Rich');
    const firstHollow = rows.findIndex(hollow);
    expect(firstHollow).toBeGreaterThan(0);
    // Hard rule: once the hollow block starts, nothing with content follows.
    expect(rows.slice(firstHollow).every(hollow)).toBe(true);
    expect(titles(rows.slice(firstHollow))).toContain('Featured Bare');
    expect(titles(rows.slice(firstHollow))).toContain('Featured Hollow');
  });

  it('demotes a high-scoring hollow row below the weakest row that has an image', async () => {
    const t = titles(await listUpcomingEvents(db, bos({ sort: 'featured' })));
    // Thin: venue image only, 40 days out, stale. Hollow: time + price + a bill, 3 days out.
    expect(t.indexOf('Featured Thin')).toBeLessThan(t.indexOf('Featured Hollow'));
  });

  it('ranks own artwork over a venue-image fallback and a long description over a short one', async () => {
    const t = titles(await listUpcomingEvents(db, bos({ sort: 'featured', to: D(3) })));
    expect(t.indexOf('Featured Rich')).toBeLessThan(t.indexOf('Featured Dup Image'));
    expect(t.indexOf('Featured Dup Image')).toBeLessThan(t.indexOf('Featured Bare'));
    expect(t.indexOf('Featured Mid Desc')).toBeLessThan(t.indexOf('Featured Bare'));
  });

  it('is deterministic and pages stably within a day', async () => {
    const a = await listUpcomingEvents(db, bos({ sort: 'featured' }));
    const b = await listUpcomingEvents(db, bos({ sort: 'featured' }));
    expect(ids(a)).toEqual(ids(b));
    const p1 = await listUpcomingEvents(db, { city: 'Boston', from: TODAY, sort: 'featured', limit: 10, offset: 0 });
    const p2 = await listUpcomingEvents(db, { city: 'Boston', from: TODAY, sort: 'featured', limit: 10, offset: 10 });
    expect(ids(p1)).toEqual(ids(a).slice(0, 10));
    expect(ids(p2)).toEqual(ids(a).slice(10, 20));
  });

  it('works when the window is a single day (the "starts soon" term is dropped)', async () => {
    const rows = await listUpcomingEvents(db, bos({ sort: 'featured', from: D(3), to: D(3) }));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.event_date === D(3))).toBe(true);
    expect(rows[0]!.title).toBe('Featured Rich');
    expect(hollow(rows[rows.length - 1]!)).toBe(true);
  });

  it('jitterSeed is stable per day and changes between days', () => {
    expect(jitterSeed('2026-09-16')).toBe(jitterSeed('2026-09-16'));
    expect(jitterSeed('2026-09-16')).not.toBe(jitterSeed('2026-09-17'));
    expect(Number.isInteger(jitterSeed('2026-09-16'))).toBe(true);
  });

  it('honours every other filter (category, free, text) while featured', async () => {
    const rows = await listUpcomingEvents(db, bos({ sort: 'featured', categories: ['comedy'] }));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.category === 'comedy')).toBe(true);
    const free = await listUpcomingEvents(db, bos({ sort: 'featured', free: true }));
    expect(free.every((r) => r.price_amount === 0 || /free/i.test(r.price ?? ''))).toBe(true);
  });
});

describe('near / radius_km', () => {
  // Feature Test Hall/Annex sit ~15 m from The Sinclair; Paradise is ~2.4 km away.
  const SINCLAIR = { lat: 42.373, lng: -71.119 };

  it('restricts to venues inside the radius', async () => {
    const rows = await listUpcomingEvents(db, bos({ near: { ...SINCLAIR, radiusKm: 1 } }));
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.venue_id))).toEqual(new Set([V.sinclair, VEN_PLAIN, VEN_IMAGE]));
    expect(await countUpcomingEvents(db, bos({ near: { ...SINCLAIR, radiusKm: 1 } }))).toBe(rows.length);
  });

  it('orders by distance: every nearby venue comes before the far one', async () => {
    const rows = await listUpcomingEvents(db, bos({ near: { ...SINCLAIR, radiusKm: 10 } }));
    const firstParadise = rows.findIndex((r) => r.venue_id === V.paradise);
    expect(firstParadise).toBeGreaterThan(0);
    expect(rows.slice(firstParadise).every((r) => r.venue_id === V.paradise)).toBe(true);
  });

  it('drops venues with no coordinates', async () => {
    const rows = await listUpcomingEvents(db, bos({ near: { ...SINCLAIR, radiusKm: 200 } }));
    expect(rows.map((r) => r.venue_id)).not.toContain(V.closed); // Closed Club has no lat/lng
  });
});

describe('filter contract: sort + near', () => {
  const parse = (q: string) => parseFilters(new URLSearchParams(q), BOS, new Date('2026-09-16T12:00:00Z'));

  it('parses sort and leaves it unset when absent or bogus', () => {
    expect(parse('sort=featured').sort).toBe('featured');
    expect(parse('sort=DATE').sort).toBe('date');
    expect(parse('').sort).toBeUndefined();
    expect(parse('sort=nonsense').sort).toBeUndefined();
  });

  it('canonicalises sort=date and drops the site default sort=featured', () => {
    expect(canonicalQuery(new URLSearchParams('sort=date'))).toBe('sort=date');
    expect(canonicalQuery(new URLSearchParams('sort=featured'))).toBe('');
    expect(canonicalQuery(new URLSearchParams('sort=bogus'))).toBe('');
    expect(canonicalQuery(new URLSearchParams('cat=music&sort=date'))).toBe('cat=music&sort=date');
  });

  it('round-trips sort through filtersToQuery', () => {
    expect(filtersToQuery({ sort: 'date' })).toBe('sort=date');
    expect(filtersToQuery({ sort: 'featured' })).toBe('');
    expect(filtersToQuery({ sort: 'date', categories: ['music'], page: 2 })).toBe('cat=music&page=2&sort=date');
  });

  it('parses near + radius_km, rounding coordinates, and rejects junk', () => {
    expect(parse('near=42.360123,-71.058999').near).toEqual({ lat: 42.36, lng: -71.059, radiusKm: 25 });
    expect(parse('near=42.36,-71.06&radius_km=5').near?.radiusKm).toBe(5);
    expect(parse('near=42.36,-71.06&radius_km=9999').near?.radiusKm).toBe(200);
    expect(parse('near=42.36,-71.06&radius_km=-3').near?.radiusKm).toBe(25);
    expect(parse('near=42.36').near).toBeUndefined();
    expect(parse('near=abc,def').near).toBeUndefined();
    expect(parse('near=99,-71').near).toBeUndefined();
  });

  // URLSearchParams percent-encodes the comma (as it already does for cat/tod lists).
  it('keeps near in the canonical query (it changes the result set, so it must key the cache)', () => {
    expect(canonicalQuery(new URLSearchParams('near=42.3601,-71.0589'))).toBe('near=42.36%2C-71.059');
    expect(canonicalQuery(new URLSearchParams('near=42.36,-71.06&radius_km=5'))).toBe('near=42.36%2C-71.06&radius_km=5');
    expect(canonicalQuery(new URLSearchParams('near=42.36,-71.06&radius_km=25'))).toBe('near=42.36%2C-71.06');
    // Round-trips: the encoded form parses back to the same filter.
    const back = parseFilters(new URLSearchParams(canonicalQuery(new URLSearchParams('near=42.3601,-71.0589'))), BOS);
    expect(back.near).toEqual({ lat: 42.36, lng: -71.059, radiusKm: 25 });
  });
});

describe('listEventsInBounds', () => {
  const BOSTON_BOX: MapEventOptions = { minLat: 42.3, minLng: -71.2, maxLat: 42.4, maxLng: -71.0, from: TODAY };

  it('returns compact rows for venues inside the box only', async () => {
    const rows = await listEventsInBounds(db, { ...BOSTON_BOX, limit: 400 });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.lat).toBeGreaterThanOrEqual(42.3);
      expect(r.lat).toBeLessThanOrEqual(42.4);
      expect(r.path).toBe(`/event/${r.id}`);
      expect(typeof r.free).toBe('boolean');
      expect(Object.keys(r).sort()).toEqual(
        ['category', 'event_date', 'free', 'id', 'image', 'lat', 'lng', 'path', 'price_min', 'start_time', 'title', 'venue_id', 'venue_name'].sort(),
      );
    }
    // NYC venues are outside the box.
    expect(rows.map((r) => r.venue_id)).not.toContain(V.mercury);
  });

  it('is not city-scoped: one box can straddle two metros', async () => {
    const rows = await listEventsInBounds(db, { minLat: 41.7, minLng: -71.5, maxLat: 42.5, maxLng: -70.9, from: TODAY, limit: 400 });
    const venues = new Set(rows.map((r) => r.venue_id));
    expect(venues.has(V.sinclair)).toBe(true);
    expect(venues.has(V.athenaeum)).toBe(true); // Providence
  });

  it('resolves the image chain server-side: event artwork, else the venue image, else null', async () => {
    const rows = await listEventsInBounds(db, { ...BOSTON_BOX, limit: 400 });
    const byTitle = (t: string) => rows.find((r) => r.title === t);
    expect(byTitle('Featured Rich')?.image).toBe('https://img/feat-rich.jpg');
    expect(byTitle('Featured Thin')?.image).toBe(VENUE_IMAGE); // venue fallback
    expect(byTitle('Featured Bare')?.image).toBeNull();
  });

  it('applies when/category/free/text filters', async () => {
    const cats = await listEventsInBounds(db, { ...BOSTON_BOX, categories: ['comedy'], limit: 400 });
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((r) => r.category === 'comedy')).toBe(true);
    const window = await listEventsInBounds(db, { ...BOSTON_BOX, to: D(1), limit: 400 });
    expect(window.every((r) => r.event_date <= D(1))).toBe(true);
    const free = await listEventsInBounds(db, { ...BOSTON_BOX, free: true, limit: 400 });
    expect(free.every((r) => r.free)).toBe(true);
    const text = await listEventsInBounds(db, { ...BOSTON_BOX, text: 'Trivia', limit: 400 });
    expect(text.length).toBeGreaterThan(0);
    expect(text.every((r) => /trivia/i.test(r.title))).toBe(true);
  });

  it('ranks featured by default and clamps the limit', async () => {
    const rows = await listEventsInBounds(db, BOSTON_BOX);
    expect(rows[0]!.title).toBe('Featured Rich');
    expect((await listEventsInBounds(db, { ...BOSTON_BOX, limit: 1 })).length).toBe(1);
    expect((await listEventsInBounds(db, { ...BOSTON_BOX, limit: 99999 })).length).toBeLessThanOrEqual(400);
    const dated = await listEventsInBounds(db, { ...BOSTON_BOX, sort: 'date', limit: 400 });
    for (let i = 1; i < dated.length; i++) expect(dated[i - 1]!.event_date <= dated[i]!.event_date).toBe(true);
  });

  it('answers an invalid box with no rows (the route rejects it with 400 first)', async () => {
    expect(await listEventsInBounds(db, { ...BOSTON_BOX, minLat: 42.4, maxLat: 42.3 })).toEqual([]);
    expect(await listEventsInBounds(db, { minLat: 30, minLng: -80, maxLat: 45, maxLng: -70, from: TODAY })).toEqual([]);
  });
});

describe('isValidBounds', () => {
  const box = { minLat: 42.3, minLng: -71.2, maxLat: 42.4, maxLng: -71.0 };
  it('accepts a sane viewport', () => {
    expect(isValidBounds(box)).toBe(true);
  });
  it('rejects inverted, out-of-range, non-finite and oversized boxes', () => {
    expect(isValidBounds({ ...box, minLat: 42.5 })).toBe(false);
    expect(isValidBounds({ ...box, minLng: -71.0, maxLng: -71.2 })).toBe(false);
    expect(isValidBounds({ ...box, maxLat: 91 })).toBe(false);
    expect(isValidBounds({ ...box, minLng: -181 })).toBe(false);
    expect(isValidBounds({ ...box, maxLat: Number.NaN })).toBe(false);
    expect(isValidBounds({ minLat: 30, minLng: -80, maxLat: 40, maxLng: -70 })).toBe(false);
    expect(isValidBounds({ minLat: 30, minLng: -80, maxLat: 33, maxLng: -77 })).toBe(true);
  });
});
