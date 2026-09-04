import type { APIRoute } from 'astro';
import { cityBySlug, getCity } from '@findlocal/shared';
import { jsonResponse } from '../../lib/apiHeaders.js';
import { getDb, listVenues } from '../../lib/db.js';

/** GET /api/venues?city=Boston[&region=Cambridge] — active venues with upcoming counts. */
export const GET: APIRoute = async ({ url }) => {
  const cityParam = url.searchParams.get('city');
  const city = getCity(cityParam) ?? cityBySlug(cityParam) ?? getCity('Boston')!;
  const region = url.searchParams.get('region')?.trim() || undefined;
  const data = await listVenues(getDb(), { city: city.name, region, withUpcoming: true });
  return jsonResponse({ data, meta: { city: city.name, count: data.length } });
};
