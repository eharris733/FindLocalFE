// Edge-cache key for SSR responses: origin + path + canonicalised known
// filter params (sorted, defaults dropped, unknown stripped) — plus `view=map`
// where a map is offered, and `_city=<fl_city cookie>` on the two routes whose
// content depends on the cookie (/ and /venues). Pure so it can be unit-tested.
import { canonicalQuery } from '@findlocal/shared';

// One definition of the cookie's name, shared with the islands that write it.
export { CITY_COOKIE } from './cityCookie.js';
export const DEFAULT_CITY_NAME = 'Boston';

/**
 * Routes whose HTML depends on the fl_city cookie. `/` still does even though it
 * is no longer a feed: the landing page's "Explore events in <city>" CTA, its
 * live widget example and its highlighted metro all come from the cookie city.
 */
export function isCityCookieRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/venues';
}

/** Routes keyed on their whole sorted query (they take params outside the filter contract). */
export function isFullQueryRoute(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname.startsWith('/embed/');
}

/** Extra (non-contract) query keys a route's HTML depends on. */
const EXTRA_KEYS: Record<string, string[]> = { '/venues': ['sort', 'type'] };

/**
 * Routes that offer `?view=map` (the map variant must not collide with the
 * list) — the feed only. `/` is the platform landing page and ignores
 * `view=map`; the middleware 301s `/?view=map` (and `/map`) to
 * `/city/<cookie city>?view=map`, so keying `/` on it would only ever store a
 * redirect under a second key.
 */
export function hasMapView(pathname: string): boolean {
  return pathname.startsWith('/city/');
}

/** Read one cookie value (URL-decoded) from a Cookie header; null when absent. */
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** Canonical query for a request URL, with the extra keys this site caches on. */
export function cacheQueryFor(url: URL, cookieCity: string | null): string {
  if (isFullQueryRoute(url.pathname)) {
    // API and embed routes take extra params (city, ids, venue, limit, view,
    // theme, region group): key on the whole sorted query so distinct requests
    // never share a cache entry.
    const all = new URLSearchParams(url.searchParams);
    all.sort();
    return all.toString();
  }
  const parts: string[] = [];
  const canon = canonicalQuery(url.searchParams);
  if (canon) parts.push(canon);
  if (hasMapView(url.pathname) && url.searchParams.get('view') === 'map') parts.push('view=map');
  for (const k of EXTRA_KEYS[url.pathname] ?? []) {
    const v = url.searchParams.get(k)?.trim();
    if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
  }
  if (isCityCookieRoute(url.pathname)) parts.push(`_city=${encodeURIComponent(cookieCity ?? DEFAULT_CITY_NAME)}`);
  return parts.join('&');
}

/** Absolute cache-key URL for a request (origin + pathname + cacheQueryFor). */
export function cacheKeyFor(url: URL, cookieCity: string | null): string {
  const q = cacheQueryFor(url, cookieCity);
  return `${url.origin}${url.pathname}${q ? `?${q}` : ''}`;
}
