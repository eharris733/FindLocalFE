// One loader for both /embed/events (SSR) and GET /api/embed/events (the JSON the
// widget's filter toolbar re-renders from), so the two can never drift: same
// scope resolution, same enrichment (books / authors / latest buyable book),
// same card model, same map markers.
//
// It owns NO SQL — every read goes through the helpers in shared/src/queries.ts.
import type { D1Database } from '@cloudflare/workers-types';
import {
  attachAuthors, attachBooks, latestBooksByAuthors, listUpcomingEvents, listUpcomingEventsForCities, type EventRow,
} from './db.js';
import {
  embedCityFilters, embedGroupRange, embedScope, eventUrl, matchesEmbedFilters, venueUrl, type EmbedParams,
} from './embed.js';
import { cardAuthors, cardThumb, eventBuyUrl, type EventCard } from './embedCard.js';
import { categoryLabel, priceLabel } from './format.js';
import {
  formatTime, getCity, parseFilters, regionGroupCities, regionGroupCityNames, type EventFilters,
} from '@findlocal/shared';

/** Structurally LeafletMap.astro's MapMarker (kept local so a .ts file never imports an .astro one). */
export interface EmbedMarker {
  lat: number;
  lng: number;
  count: number;
  title: string;
  href: string;
  subtitle?: string | undefined;
  items?: { label: string; href: string }[];
  /** Photo pin: the lead event's thumbnail (same image chain as its row). */
  image?: string | undefined;
  /** Colours the pin ring. */
  category?: string | undefined;
}

export interface EmbedData {
  cards: EventCard[];
  markers: EmbedMarker[];
  /** Rows behind the cards (the page still needs them for the map/centre). */
  events: EventRow[];
  heading: string;
  scopeName: string;
  tz: string;
  from: string;
  to: string | null;
  /** More events matched than `limit`: the widget links out for the rest. */
  truncated: boolean;
  center: { lat: number; lng: number; zoom: number };
}

/** How many rows to pull for a region-group query whose extra filters (text, price,
 * time of day) can only be applied in JS — see matchesEmbedFilters. */
const GROUP_OVERSAMPLE = 5;
const GROUP_MAX_ROWS = 500;

/** true when the query needs filters the multi-city SQL cannot express. */
function needsJsFilters(f: EventFilters): boolean {
  return !!(f.text || f.free || f.paid || f.maxPrice !== undefined || f.timeOfDay?.length);
}

async function loadRows(db: D1Database, p: EmbedParams, now: Date): Promise<Omit<EmbedData, 'cards' | 'markers' | 'heading' | 'center'>> {
  const scope = embedScope(p);
  if (!scope) return { events: [], scopeName: '', tz: 'America/New_York', from: '', to: null, truncated: false };
  if (scope.kind === 'city') {
    const f = embedCityFilters(p, scope.city, now);
    const rows = await listUpcomingEvents(db, f);
    return {
      events: rows.slice(0, p.limit), scopeName: scope.city.name, tz: scope.city.tz,
      from: f.from ?? '', to: f.to ?? null, truncated: rows.length > p.limit,
    };
  }
  const group = scope.group;
  const range = embedGroupRange(p, group, now);
  // Date-independent fields only (the window above is the group's, not a city's).
  const extra = parseFilters(p.filterParams, regionGroupCities(group)[0] ?? getCity('Boston')!, now);
  const js = needsJsFilters(extra);
  const rows = await listUpcomingEventsForCities(db, {
    cities: regionGroupCityNames(group), categories: p.categories, from: range.from, to: range.to,
    limit: js ? Math.min(GROUP_MAX_ROWS, Math.max(p.limit * GROUP_OVERSAMPLE, 200)) : p.limit + 1,
    tz: group.tz, authorsOnly: p.authorsOnly,
  });
  const matched = js ? rows.filter((e) => matchesEmbedFilters(e, extra)) : rows;
  return {
    events: matched.slice(0, p.limit), scopeName: group.name, tz: group.tz,
    from: range.from, to: range.to, truncated: matched.length > p.limit,
  };
}

function headingFor(p: EmbedParams, scopeName: string): string {
  const cats = p.categories.length ? p.categories.map(categoryLabel).join(' & ') : '';
  const kind = p.authorsOnly ? 'Author' : cats || 'Upcoming';
  // Just the place's own name in the heading ("Somerville"), not the county/state
  // tail the geocoder returns — the full label stays in the Near box.
  const place = p.ui.place?.split(',')[0]?.trim();
  const where = p.near ? `near ${place || 'you'}` : `in ${scopeName}`;
  return `${kind} events ${where}`;
}

/** Everything both front doors render for one embed query. */
export async function loadEmbedData(db: D1Database, p: EmbedParams, now: Date = new Date()): Promise<EmbedData> {
  const base = await loadRows(db, p, now);
  const events = base.events;
  // Literary enrichment: linked books, gazetteer authors and each author's latest
  // buyable book (the author-name link + the cover fallback). No-ops otherwise.
  await attachBooks(db, events);
  await attachAuthors(db, events);
  const latest = await latestBooksByAuthors(db, events.flatMap((e) => e.author_ids));
  const multi = !p.near && !!p.group;
  const place = (e: EventRow) => (multi ? e.venue_region || e.region || e.city : e.venue_region || e.region || '');
  const cards: EventCard[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.event_date,
    time: formatTime(e.start_time),
    venue: e.venue_name,
    place: place(e),
    url: eventUrl(e.id, p.campaign, p.partner),
    path: `/event/${e.id}`,
    price: priceLabel(e),
    buyUrl: eventBuyUrl(e),
    thumb: cardThumb(e, latest),
    authors: cardAuthors(e, latest),
  }));
  return {
    ...base,
    cards,
    markers: markersFor(events, p, cards),
    heading: headingFor(p, base.scopeName),
    center: centerFor(p),
  };
}

/** One marker per venue (as EventMap.astro), links carrying the widget's UTM params.
 * `cards` (same order as `events`) supplies the pin photo, so a pin shows exactly
 * what its row shows — cover, portrait, photo or category art. */
export function markersFor(events: EventRow[], p: EmbedParams, cards: EventCard[] = []): EmbedMarker[] {
  const byVenue = new Map<string, EmbedMarker>();
  for (const [i, e] of events.entries()) {
    if (e.venue_lat == null || e.venue_lng == null) continue;
    let m = byVenue.get(e.venue_id);
    if (!m) {
      m = {
        lat: e.venue_lat, lng: e.venue_lng, count: 0, title: e.venue_name,
        href: venueUrl(e.venue_id, p.campaign, p.partner), subtitle: e.venue_address ?? undefined, items: [],
        image: cards[i]?.thumb?.src, category: e.category ?? undefined,
      };
      byVenue.set(e.venue_id, m);
    }
    m.count += 1;
    if (m.items!.length < 4) m.items!.push({ label: e.title, href: eventUrl(e.id, p.campaign, p.partner) });
  }
  return [...byVenue.values()];
}

/** Map centre: the `near` point, else the city, else the region group's first metro. */
export function centerFor(p: EmbedParams): { lat: number; lng: number; zoom: number } {
  if (p.near) return { lat: p.near.lat, lng: p.near.lng, zoom: p.near.radiusKm <= 10 ? 12 : 10 };
  if (p.city) return { lat: p.city.lat, lng: p.city.lng, zoom: p.city.zoom };
  const first = p.group ? regionGroupCities(p.group)[0] : undefined;
  return { lat: first?.lat ?? 42.36, lng: first?.lng ?? -71.06, zoom: 7 };
}
