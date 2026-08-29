// Dynamic sitemap index at /sitemap (robots.txt and Search Console point
// here). Children live under /sitemaps/* — see functions/sitemaps/[name].ts.
// The old single-urlset version silently capped at 1000 events + 1000 venues
// (PostgREST's server-side row limit ignores `limit=50000`), leaving ~90% of
// pages out of the sitemap.

import { Env, ORIGIN, supabaseCount, todayString } from './_shared';

export const EVENTS_PER_SITEMAP = 5000;

export async function onRequest(context: { env: Env }) {
  let eventCount: number | null = null;
  try {
    eventCount = await supabaseCount(
      context.env,
      'events_gold',
      `event_date=gte.${todayString()}&is_deleted=eq.false`
    );
  } catch {
    eventCount = null;
  }
  // If the count fails, still emit a plausible index; extra children 404
  // harmlessly and missing ones return on the next crawl.
  const eventChildren = Math.max(1, Math.ceil((eventCount ?? 35000) / EVENTS_PER_SITEMAP));

  const children = [
    'static.xml',
    'venues.xml',
    ...Array.from({ length: eventChildren }, (_, i) => `events-${i + 1}.xml`),
  ];

  const entries = children
    .map((name) => `  <sitemap><loc>${ORIGIN}/sitemaps/${name}</loc></sitemap>`)
    .concat(`  <sitemap><loc>${ORIGIN}/sitemap-blog.xml</loc></sitemap>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
