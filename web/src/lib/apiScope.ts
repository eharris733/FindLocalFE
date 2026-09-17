// Classifies an `/api/*` pathname into how it is protected.
//
//   keyed — the sellable developer API: requires a valid Unkey key. Server-to-
//           server endpoints an integrator or agent calls.
//   open  — first-party, browser-driven endpoints that CANNOT hold a secret key
//           (they run in client JS): the live map, the partner widget's JSON twin,
//           and the geo hint. These stay public and are NOT part of the paid
//           contract. `/api/embed/events` must also stay CORS-open (partner sites).
//   none  — not an API route (or an exempt one like the billing webhook).
//
// The gate in middleware.ts only enforces `keyed`. Keep `open` deliberately narrow
// so a new /api/* route defaults to `open` (public) rather than being silently
// gated — but note `/api/events/map` returns only compact pins, materially less
// than the keyed `/api/events`; hardening it (e.g. a Sec-Fetch-Site same-origin
// check) is a documented follow-up, not part of phase 1.

export type ApiScope = 'keyed' | 'open' | 'none';

/** Browser-driven first-party endpoints — matched before the keyed patterns
 * because `/api/events/map` also looks like `/api/events/<id>`. */
const OPEN_PATHS = new Set(['/api/geo', '/api/events/map', '/api/embed/events']);

export function apiScope(pathname: string): ApiScope {
  if (!pathname.startsWith('/api/')) return 'none';
  if (OPEN_PATHS.has(pathname)) return 'open';
  if (pathname === '/api/events' || pathname === '/api/venues') return 'keyed';
  // /api/events/<uuid> (single event). `/map` is already handled above.
  if (/^\/api\/events\/[^/]+$/.test(pathname)) return 'keyed';
  return 'open';
}
