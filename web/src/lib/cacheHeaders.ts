// Edge/browser cache policy per route family. The middleware stores 2xx GET
// responses in the Cloudflare Cache API under a key built by cacheKey.ts and
// honours `s-maxage` from the header it stores; browsers only see `max-age`.
//
//   / (platform landing) 3600 s edge            (catalogue aggregates, per city)
//   city pages          1800 s edge, SWR 1 day  (listings change once daily per scrape)
//   venues              600 s edge, SWR 1 day
//   event / venue       3600 s edge
//   sitemap(s)          86400 s edge
//   /api/*              300 s edge
//   /api/geo            never (per-request edge geolocation — must not be shared)
//   /embed/*            600 s edge (widgets; keyed on the full query)
//   /saved, non-GET, non-2xx: never cached

export interface CachePolicy {
  /** Edge TTL in seconds; 0 = bypass the edge cache. */
  edge: number;
  /** Browser max-age in seconds. */
  browser: number;
  /** Personalised by the fl_city cookie: browsers must revalidate every time. */
  perCity: boolean;
}

const SWR = 86400;

export function cachePolicyFor(pathname: string): CachePolicy {
  if (pathname === '/saved') return { edge: 0, browser: 0, perCity: false };
  // Geolocated per request: one shared edge copy would hand every visitor the
  // first colo's answer.
  if (pathname === '/api/geo') return { edge: 0, browser: 0, perCity: false };
  // `/` is the platform landing page: catalogue-wide aggregates that move once a
  // day, so it takes an hour at the edge (still per-city — its CTA, example
  // widget and coverage highlight follow the fl_city cookie).
  if (pathname === '/') return { edge: 3600, browser: 0, perCity: true };
  if (pathname === '/venues') return { edge: 600, browser: 0, perCity: true };
  // Listings only change once a day (the nightly scrape), so a 30-minute edge
  // TTL is safe and, with Smart Tiered Cache, sharply cuts the cold-per-colo
  // MISS → D1 reads that were timing out (504) under fan-out crawler load.
  if (pathname.startsWith('/city/')) return { edge: 1800, browser: 300, perCity: false };
  if (pathname.startsWith('/event/') || pathname.startsWith('/venue/')) return { edge: 3600, browser: 300, perCity: false };
  if (pathname === '/sitemap.xml' || pathname.startsWith('/sitemaps/')) return { edge: 86400, browser: 3600, perCity: false };
  if (pathname.startsWith('/api/')) return { edge: 300, browser: 60, perCity: false };
  if (pathname.startsWith('/embed/')) return { edge: 600, browser: 60, perCity: false };
  // Static-ish SSR pages (404, blog fallbacks): short edge TTL.
  return { edge: 600, browser: 300, perCity: false };
}

/** Header value stored with the edge copy (drives the Cache API TTL). */
export function edgeCacheControl(p: CachePolicy): string {
  return `public, s-maxage=${p.edge}, stale-while-revalidate=${SWR}`;
}

/** Header value the browser receives. Cookie-personalised pages must never be
 * reused from a shared or private HTTP cache without revalidation. */
export function browserCacheControl(p: CachePolicy): string {
  if (p.edge === 0) return 'private, no-store';
  if (p.perCity) return 'private, no-cache';
  return `public, max-age=${p.browser}, s-maxage=${p.edge}, stale-while-revalidate=${SWR}`;
}
