import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/apiHeaders.js';
import { getDb, listEventsInBounds } from '../../../lib/db.js';
import { parseMapParams } from '../../../lib/mapQuery.js';

/**
 * GET /api/events/map?bbox=minLng,minLat,maxLng,maxLat&when=&cat=&free=1&q=&limit=
 *
 * Events whose venue sits inside a map viewport, as compact pin rows. The bbox
 * IS the scope — no city parameter — so a box straddling two metros returns
 * both. Boxes larger than 4° on a side are refused with 400 (that is a query
 * over most of a time zone, not a map view). Ordered `featured` by default so a
 * clipped viewport keeps the events worth showing; `sort=date` for chronological.
 */
export const GET: APIRoute = async ({ url }) => {
  const parsed = parseMapParams(url.searchParams);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);
  const o = parsed.options;
  const data = await listEventsInBounds(getDb(), o);
  return jsonResponse(
    {
      data,
      meta: {
        count: data.length,
        limit: o.limit,
        truncated: data.length === o.limit,
        bbox: { min_lng: o.minLng, min_lat: o.minLat, max_lng: o.maxLng, max_lat: o.maxLat },
        from: o.from,
        to: o.to ?? null,
        sort: o.sort,
      },
    },
    200,
    // A viewport is a per-user query; keep it fresh but let a pan-back reuse it.
    { 'Cache-Control': 'public, max-age=60, s-maxage=120' },
  );
};

export const OPTIONS: APIRoute = () => jsonResponse(null, 204);
