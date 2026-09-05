import type { APIRoute } from 'astro';
import { PAGE_SIZE, getCity, cityBySlug, isUuid, parseFilters } from '@findlocal/shared';
import { jsonResponse } from '../../../lib/apiHeaders.js';
import { getDb, countUpcomingEvents, getEventsByIds, listUpcomingEvents } from '../../../lib/db.js';

const MAX_IDS = 200;

/**
 * GET /api/events?city=Boston&when=weekend&cat=music&free=1&tod=evening&region=&q=&page=
 *   — the same filter contract as the site (parseFilters); `limit` (<=500) optional.
 * GET /api/events?ids=<uuid>,<uuid>  — any date, deleted included (the /saved page).
 * GET /api/events?venue=<uuid>       — upcoming at one venue.
 */
export const GET: APIRoute = async ({ url }) => {
  const db = getDb();
  const p = url.searchParams;

  const idsRaw = p.get('ids');
  if (idsRaw) {
    const ids = idsRaw.split(',').map((s) => s.trim().toLowerCase()).filter(isUuid).slice(0, MAX_IDS);
    const data = ids.length ? await getEventsByIds(db, ids) : [];
    return jsonResponse({ data, meta: { count: data.length } });
  }

  const cityParam = p.get('city');
  const city = getCity(cityParam) ?? cityBySlug(cityParam) ?? getCity('Boston')!;
  const filters = parseFilters(p, city);
  const venue = p.get('venue');
  if (venue && isUuid(venue)) filters.venueId = venue.toLowerCase();
  const limit = Number(p.get('limit'));
  if (Number.isInteger(limit) && limit > 0) filters.limit = Math.min(limit, 500);
  const [data, total] = await Promise.all([listUpcomingEvents(db, filters), countUpcomingEvents(db, filters)]);
  return jsonResponse({
    data,
    meta: { city: city.name, count: data.length, total, page: (filters.offset ?? 0) / PAGE_SIZE + 1, page_size: filters.limit ?? PAGE_SIZE },
  });
};

export const OPTIONS: APIRoute = () => jsonResponse(null, 204);
