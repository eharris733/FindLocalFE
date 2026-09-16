import type { APIRoute } from 'astro';
import { API_DEFAULT_SORT } from '@findlocal/shared';
import { jsonResponse } from '../../../lib/apiHeaders.js';
import { BOOKSHOP_LINK_REL } from '../../../lib/bookshop.js';
import { getDb } from '../../../lib/db.js';
import { loadEmbedData } from '../../../lib/embedData.js';
import { embedScope, parseEmbedParams, siteUrl } from '../../../lib/embed.js';

/**
 * GET /api/embed/events?<the /embed/events query contract>
 *
 * The enriched card model behind the widget — exactly what /embed/events renders
 * server-side (thumbnail through the book-cover → author-photo → event → venue →
 * category-art chain, author line with credited Bookshop links, "Buy the book",
 * price label, UTM'd links, map markers). The in-widget filter toolbar fetches
 * this and re-renders the list / calendar / map in place, so the enrichment
 * lives in one place instead of being reimplemented in client JS.
 *
 * Same keys as the iframe: region | city, cat (partner pin) | ucat (visitor
 * chips), when (incl. `month`) | from,to, q, free, paid, tod, authors, max,
 * sort, near=<lat>,<lng> + radius_km, limit (<=300), partner, view/theme
 * (ignored here). `near` replaces the region/city scope with the nearest metro
 * and orders by distance. 404 for an unknown region/city/category, as the page.
 *
 * Cached like the other /api routes (300 s at the edge, keyed on the full query).
 */
export const GET: APIRoute = async ({ url }) => {
  const p = parseEmbedParams(url.searchParams);
  if (p.error) return jsonResponse({ error: p.error }, 404);
  const data = await loadEmbedData(getDb(), p);
  const scope = embedScope(p);
  const seeAll = scope?.kind === 'city' ? `/city/${scope.city.slug}` : '/';
  return jsonResponse({
    data: data.cards,
    markers: data.markers,
    meta: {
      // With `near` the scope IS the nearest metro, whatever the partner pinned.
      scope: scope?.kind === 'group'
        ? { region: scope.group.slug, name: scope.group.name }
        : { city: data.scopeName },
      heading: data.heading,
      tz: data.tz,
      from: data.from,
      to: data.to,
      count: data.cards.length,
      limit: p.limit,
      truncated: data.truncated,
      sort: p.near ? 'distance' : (p.filterParams.get('sort') ?? API_DEFAULT_SORT),
      authors_only: p.authorsOnly,
      categories: p.categories,
      near: p.near ? { lat: p.near.lat, lng: p.near.lng, radius_km: p.near.radiusKm, place: p.ui.place ?? null } : null,
      center: data.center,
      buy_rel: BOOKSHOP_LINK_REL,
      see_all: siteUrl(seeAll, p.campaign, p.partner),
    },
  });
};

export const OPTIONS: APIRoute = () => jsonResponse(null, 204);
