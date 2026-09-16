import type { APIRoute } from 'astro';
import { nearestCity } from '@findlocal/shared';
import { jsonResponse } from '../../lib/apiHeaders.js';

/** `request.cf` (Workers only) — absent under `astro dev` and in tests. */
interface CfGeo {
  latitude?: string;
  longitude?: string;
  city?: string;
  region?: string;
  country?: string;
}

/**
 * GET /api/geo — the nearest supported metro for this request's edge geolocation.
 *
 * Deliberately a separate, NEVER-CACHED endpoint: the rendered pages must not
 * vary by CF geo headers (it would fragment the edge cache and make Googlebot's
 * copy depend on which colo served it), so the feed picks its city from the
 * `fl_city` cookie only and merely *suggests* a switch from this response.
 *
 * `{ city: { name, slug, state, tz, lat, lng } | null, point, source }`.
 */
export const GET: APIRoute = async ({ request }) => {
  const cf = (request as unknown as { cf?: CfGeo }).cf;
  const lat = Number(cf?.latitude);
  const lng = Number(cf?.longitude);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonResponse({ city: null, point: null, source: 'none' }, 200, headers);
  }
  const city = nearestCity(lat, lng);
  return jsonResponse(
    {
      city: { name: city.name, slug: city.slug, state: city.state, tz: city.tz, lat: city.lat, lng: city.lng },
      // Rounded to ~1 km: enough for a "near me" query, not a precise location.
      point: { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 },
      source: 'cf',
    },
    200,
    headers,
  );
};

export const OPTIONS: APIRoute = () => jsonResponse(null, 204);
