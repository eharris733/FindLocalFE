// Pure helpers for the dynamic event map: the /api/events/map row shape, the
// per-category pin colour, and the venue grouping + label formatting the client
// script uses. No DOM and no Leaflet here so it unit-tests in the workers pool.

/** One row of `GET /api/events/map` (MapEventRow in shared/src/queries.ts). */
export interface MapApiRow {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  category: string | null;
  image: string | null;
  venue_id: string;
  venue_name: string;
  lat: number;
  lng: number;
  price_min: number | null;
  free: boolean;
  path: string;
}

export interface MapApiResponse {
  data: MapApiRow[];
  meta?: { count: number; limit: number; truncated: boolean };
}

/** Ring colour per category slug — the pin's only categorical signal, so the
 * hues stay distinct rather than on-brand. Unknown/None falls back to teal. */
export const PIN_COLORS: Record<string, string> = {
  music: '#7c3aed',
  comedy: '#f59e0b',
  theater: '#db2777',
  dance: '#e11d48',
  literary: '#0891b2',
  art: '#6366f1',
  food_drink: '#ea580c',
  family: '#16a34a',
  market: '#ca8a04',
  workshop: '#0d9488',
  fitness: '#059669',
  nightlife: '#4f46e5',
  community: '#2563eb',
  festival: '#d946ef',
  parks: '#15803d',
};
export const PIN_COLOR_DEFAULT = '#006565';

export function pinColor(category: string | null | undefined): string {
  return (category && PIN_COLORS[category]) || PIN_COLOR_DEFAULT;
}

/** 'Sat, Sep 20' / 'Sat, Sep 20 · 7:30 PM'. All arithmetic in UTC so a calendar
 * day never shifts; `event_date` is a plain day, never a timestamp. */
export function pinDateLabel(date: string, time: string | null): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const t = pinTimeLabel(time);
  return t ? `${day} · ${t}` : day;
}

/** '19:30:00' -> '7:30 PM'; '' for null/unparseable. */
export function pinTimeLabel(time: string | null): string {
  if (!time) return '';
  const [hRaw, minRaw] = time.split(':');
  const h = Number(hRaw);
  if (!Number.isFinite(h)) return '';
  const min = minRaw ?? '00';
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${min.padStart(2, '0')} ${suffix}`;
}

export interface PinItem {
  label: string;
  href: string;
  /** Secondary line (date · time). */
  meta?: string;
}

export interface VenuePin {
  lat: number;
  lng: number;
  /** Events at this venue in the current viewport (badge number). */
  count: number;
  title: string;
  href: string;
  subtitle?: string;
  items: PinItem[];
  image?: string;
  /** Category of the first (highest-ranked) event — drives the ring colour. */
  category?: string;
}

/**
 * One pin per venue, in the row order the API returned (featured first), each
 * carrying up to `maxItems` event lines. The pin's image and category come from
 * the first row that has them, so the best-ranked event supplies the photo.
 */
export function groupByVenue(rows: MapApiRow[], maxItems = 4): VenuePin[] {
  const byVenue = new Map<string, VenuePin>();
  for (const r of rows) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    let pin = byVenue.get(r.venue_id);
    if (!pin) {
      pin = { lat: r.lat, lng: r.lng, count: 0, title: r.venue_name, href: `/venue/${r.venue_id}`, items: [] };
      byVenue.set(r.venue_id, pin);
    }
    pin.count += 1;
    if (!pin.image && r.image) pin.image = r.image;
    if (!pin.category && r.category) pin.category = r.category;
    if (pin.items.length < maxItems) {
      pin.items.push({ label: r.title, href: r.path, meta: pinDateLabel(r.event_date, r.start_time) });
    }
  }
  return [...byVenue.values()];
}

/** `bbox=minLng,minLat,maxLng,maxLat` for the map API, clamped and 4-dp rounded. */
export function bboxParam(b: { west: number; south: number; east: number; north: number }): string {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return [
    r(Math.max(b.west, -180)),
    r(Math.max(b.south, -90)),
    r(Math.min(b.east, 180)),
    r(Math.min(b.north, 90)),
  ].join(',');
}
