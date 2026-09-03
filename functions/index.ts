// Homepage. Server-renders the canonical head (every query variant — /?view=map,
// utm params… — gets the same bare "/" canonical, which collapsed the
// duplicate-URL cluster in Search Console) AND, for the list view, the first
// screen of event cards (see functions/_feed.ts) so mobile has real content and
// a discoverable LCP image before the SPA bundle runs. Keep the copy in sync
// with scripts/inject-head.js.
//
// City comes from the `fl_city` cookie the app sets (src/context/CityContext),
// defaulting to Boston. Rendered pages are cached per city at the edge with the
// Cache API — Pages Function responses are never CDN-cached by `s-maxage`
// alone — and served `no-cache` to browsers because the HTML varies by cookie.
// Any Supabase problem falls back to the plain shell at 200.

import {
  Env,
  ORIGIN,
  applyMeta,
  fetchShell,
  readCookie,
  staticPageMeta,
  supabaseSelect,
  todayString,
} from './_shared';
import { FUNCTION_CITIES, citySlug } from './_cities';
import {
  FEED_EVENT_COLUMNS,
  FEED_FETCH_LIMIT,
  FEED_LIMIT,
  FEED_VENUE_COLUMNS,
  renderFeedFragment,
  sortFeedRows,
  type FeedEventRow,
  type FeedVenueRow,
} from './_feed';

const DEFAULT_CITY = 'Boston';
const EDGE_TTL_SECONDS = 300;

const META = staticPageMeta(
  '/',
  'Find Local — Discover Local Events: Concerts, Comedy, Theater & More',
  'Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences across 31 US cities. Free and paid events updated daily.'
);

interface Context {
  env: Env;
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}

function resolveCity(request: Request): string {
  const cookie = readCookie(request, 'fl_city');
  return cookie && FUNCTION_CITIES.some((c) => c.name === cookie) ? cookie : DEFAULT_CITY;
}

function browserResponse(html: string, extra: Record<string, string> = {}): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Varies by cookie, so browsers must revalidate; the edge cache below
      // is what absorbs the load.
      'Cache-Control': 'private, no-cache',
      Vary: 'Cookie',
      ...extra,
    },
  });
}

/** First-screen rows for `city`, or null when anything goes wrong. */
async function fetchFirstScreen(
  env: Env,
  city: string,
  today: string
): Promise<{ events: FeedEventRow[]; venues: FeedVenueRow[] } | null> {
  try {
    // Filter must match getEventsPage in src/api/events.ts. Over-fetch, then
    // apply the client's (day, start_time, id) sort and keep the first
    // FEED_LIMIT so the static cards equal the client's first rows.
    const fetched = await supabaseSelect<FeedEventRow>(
      env,
      'events_gold',
      `city=eq.${encodeURIComponent(city)}&event_date=gte.${today}` +
        `&or=(is_deleted.is.null,is_deleted.eq.false)&select=${FEED_EVENT_COLUMNS}` +
        `&order=event_date.asc,start_time.asc.nullslast,id.asc&limit=${FEED_FETCH_LIMIT}`
    );
    if (!fetched || fetched.length === 0) return null;
    const events = sortFeedRows(fetched).slice(0, FEED_LIMIT);

    const venueIds = [...new Set(events.map((e) => e.venue_id).filter((id): id is string => !!id))];
    const venues = venueIds.length
      ? await supabaseSelect<FeedVenueRow>(
          env,
          'venues',
          `id=in.(${venueIds.map(encodeURIComponent).join(',')})&select=${FEED_VENUE_COLUMNS}`
        )
      : [];
    return { events, venues: venues ?? [] };
  } catch {
    return null;
  }
}

export async function onRequest(context: Context): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const shellPromise = fetchShell(env, request.url);

  // The map view renders no cards; plain shell as before.
  if (url.searchParams.get('view') === 'map') {
    return browserResponse(applyMeta(await shellPromise, META));
  }

  const city = resolveCity(request);
  const cacheKey = new Request(`${ORIGIN}/__feed-cache/${citySlug(city)}`);
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set('Cache-Control', 'private, no-cache');
      headers.set('X-Feed-Cache', 'HIT');
      return new Response(hit.body, { status: 200, headers });
    }
  }

  const today = todayString();
  const [shell, firstScreen] = await Promise.all([shellPromise, fetchFirstScreen(env, city, today)]);
  let html = applyMeta(shell, META);

  if (!firstScreen) {
    return browserResponse(html, { 'X-Feed-Cache': 'BYPASS' });
  }

  const { headHtml, bodyHtml } = renderFeedFragment(city, today, firstScreen.events, firstScreen.venues);
  html = html.replace('</head>', `${headHtml}\n</head>`);
  // The fragment sits beside #root (React owns #root and would wipe it).
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${bodyHtml}`);

  if (cache) {
    const toCache = new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': `s-maxage=${EDGE_TTL_SECONDS}`,
        'X-Feed-City': city,
      },
    });
    const put = cache.put(cacheKey, toCache);
    if (context.waitUntil) context.waitUntil(put);
    else await put;
  }

  return browserResponse(html, { 'X-Feed-Cache': 'MISS', 'X-Feed-City': city });
}
