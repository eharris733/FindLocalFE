// Serves the sitemap-index children: /sitemaps/static.xml, venues.xml,
// events-{n}.xml. Each events child holds EVENTS_PER_SITEMAP URLs fetched in
// 1000-row Range windows (PostgREST's hard per-request cap).

import { Env, ORIGIN, supabaseSelectRange, todayString } from '../_shared';
import { FUNCTION_CITIES } from '../_cities';
import { EVENTS_PER_SITEMAP } from '../sitemap';

const PAGE = 1000;

interface SitemapRow {
  id: string;
  created_at: string | null;
}

function urlEntry(loc: string, lastmod?: string | null): string {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url><loc>${loc}</loc>${lastmodTag}</url>`;
}

function urlsetResponse(entries: string[], status = 200): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
  return new Response(xml, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function staticEntries(): string[] {
  // /blog and its posts live in sitemap-blog.xml (emitted by the build).
  const fixed = ['/', '/about', '/venues', '/platform', '/privacy', '/terms'];
  const cities = FUNCTION_CITIES.map((c) => `/city/${c.slug}`);
  // No <lastmod> here — fabricating "today" for pages that rarely change
  // teaches crawlers to ignore our lastmod everywhere else.
  return [...fixed, ...cities].map((path) => urlEntry(`${ORIGIN}${path}`));
}

async function venueEntries(env: Env): Promise<string[]> {
  const entries: string[] = [];
  for (let offset = 0; offset < 10000; offset += PAGE) {
    const rows = await supabaseSelectRange<SitemapRow>(
      env,
      'venues',
      'is_active=eq.true&select=id,created_at&order=name.asc,id.asc',
      offset,
      offset + PAGE - 1
    );
    if (!rows) break;
    for (const row of rows) {
      entries.push(urlEntry(`${ORIGIN}/venue/${row.id}`, row.created_at));
    }
    if (rows.length < PAGE) break;
  }
  return entries;
}

async function eventEntries(env: Env, chunk: number): Promise<string[]> {
  const start = (chunk - 1) * EVENTS_PER_SITEMAP;
  const filter = `event_date=gte.${todayString()}&is_deleted=eq.false&select=id,created_at&order=event_date.asc,id.asc`;
  const entries: string[] = [];
  for (let offset = start; offset < start + EVENTS_PER_SITEMAP; offset += PAGE) {
    const rows = await supabaseSelectRange<SitemapRow>(env, 'events_gold', filter, offset, offset + PAGE - 1);
    if (!rows) break;
    for (const row of rows) {
      entries.push(urlEntry(`${ORIGIN}/event/${row.id}`, row.created_at));
    }
    if (rows.length < PAGE) break;
  }
  return entries;
}

export async function onRequest(context: { env: Env; params: { name: string } }) {
  const name = context.params.name;
  try {
    if (name === 'static.xml') return urlsetResponse(staticEntries());
    if (name === 'venues.xml') return urlsetResponse(await venueEntries(context.env));

    const eventsMatch = /^events-(\d{1,3})\.xml$/.exec(name);
    if (eventsMatch) {
      const chunk = parseInt(eventsMatch[1], 10);
      if (chunk >= 1) return urlsetResponse(await eventEntries(context.env, chunk));
    }
  } catch {
    // fall through to 404 — a transient DB failure shouldn't cache a bad body
  }
  return new Response('Not found', { status: 404 });
}
