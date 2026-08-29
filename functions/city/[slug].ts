// Crawlable per-city landing pages at /city/<slug> ("things to do in Boston"
// queries, and citable pages for AI answer engines). These render standalone
// server-side HTML rather than the SPA shell: expo-router has no /city route,
// so the shell would hydrate into an unmatched screen underneath the content.
// Design tokens copied from public/platform/index.html.

import { Env, ORIGIN, escapeHtml, goneResponse, supabaseSelect, todayString } from '../_shared';
import { FUNCTION_CITIES, cityBySlug } from '../_cities';

interface CityEventRow {
  id: string;
  title: string | null;
  event_date: string | null;
  start_time: string | null;
  event_type: string | null;
  venues: { name: string | null } | null;
}

const EVENT_LIMIT = 100;

function formatDay(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(h)) return null;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

export async function onRequest(context: {
  env: Env;
  params: { slug: string };
  request: Request;
}): Promise<Response> {
  const { env, params, request } = context;
  const slug = params.slug.toLowerCase();
  if (slug !== params.slug) {
    return Response.redirect(`${ORIGIN}/city/${slug}`, 301);
  }
  const city = cityBySlug(slug);
  if (!city) return goneResponse(env, request.url, 404);

  let events: CityEventRow[] | null = null;
  try {
    events = await supabaseSelect<CityEventRow>(
      env,
      'events_gold',
      `city=eq.${encodeURIComponent(city.name)}&event_date=gte.${todayString()}&is_deleted=eq.false` +
        `&select=id,title,event_date,start_time,event_type,venues(name)` +
        `&order=event_date.asc,start_time.asc&limit=${EVENT_LIMIT}`
    );
  } catch {
    events = null;
  }
  const rows = (events ?? []).filter((e) => e.title && e.event_date);

  const canonical = `${ORIGIN}/city/${slug}`;
  const cityLabel = `${city.name}, ${city.state}`;
  const title = `Things to Do in ${city.name} — Concerts, Comedy, Theater & More | Find Local`;
  const description =
    `Upcoming live music, comedy, theater, and community events in ${cityLabel}, ` +
    `pulled straight from local venue calendars and updated daily.`;
  // Fewer than a handful of events is a thin page — keep it up for humans but
  // don't ask Google to index it.
  const noindex = rows.length < 3;

  // Group by day, preserving date order.
  const byDay = new Map<string, CityEventRow[]>();
  for (const row of rows) {
    const day = row.event_date!.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(row);
    byDay.set(day, list);
  }

  const sections = [...byDay.entries()]
    .map(([day, list]) => {
      const items = list
        .map((e) => {
          const time = formatTime(e.start_time);
          const venueName = e.venues?.name;
          const meta = [time, venueName].filter(Boolean).join(' · ');
          return `<li><a href="/event/${e.id}">${escapeHtml(e.title!)}</a>${
            meta ? `<span class="meta"> — ${escapeHtml(meta)}</span>` : ''
          }</li>`;
        })
        .join('\n');
      return `<section><h2>${escapeHtml(formatDay(day))}</h2>\n<ul>${items}</ul></section>`;
    })
    .join('\n');

  const otherCities = FUNCTION_CITIES.filter((c) => c.slug !== slug)
    .map((c) => `<a href="/city/${c.slug}">${escapeHtml(c.name)}</a>`)
    .join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Upcoming events in ${cityLabel}`,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 25).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.title,
      url: `${ORIGIN}/event/${e.id}`,
    })),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: `Events in ${city.name}`, item: canonical },
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${canonical}" />
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
<meta name="theme-color" content="#006565" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Find Local" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${canonical}" />
<link rel="icon" href="/favicon.ico" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c')}</script>
<style>
  :root{--bg:#fff;--border:#E5E7EB;--teal:#006565;--teal-soft:#E6F7F5;--orange:#EC7C35;
    --text:#111827;--text-2:#4B5563;--text-3:#9CA3AF;--maxw:840px;
    --sans:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    --head:'Epilogue',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
  h1,h2{font-family:var(--head);letter-spacing:-.03em;line-height:1.15}
  a{color:var(--teal)}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
  header{border-bottom:1px solid var(--border)}
  header .wrap{display:flex;align-items:center;gap:24px;height:64px}
  header .brand{font-family:var(--head);font-weight:800;font-size:20px;color:var(--text);text-decoration:none}
  header nav{display:flex;gap:20px;margin-left:auto}
  header nav a{color:var(--text-2);text-decoration:none;font-weight:600;font-size:15px}
  main{padding:40px 0 64px}
  h1{font-size:clamp(28px,5vw,40px);margin:0 0 8px}
  .intro{color:var(--text-2);margin:0 0 32px;max-width:640px}
  section h2{font-size:20px;margin:32px 0 8px;color:var(--teal)}
  section ul{margin:0;padding-left:20px}
  section li{margin:6px 0}
  section a{font-weight:600}
  .meta{color:var(--text-3)}
  .cta{display:inline-block;background:var(--teal);color:#fff;text-decoration:none;font-weight:700;
    padding:10px 20px;border-radius:12px;margin-top:32px}
  footer{border-top:1px solid var(--border);padding:32px 0 48px;color:var(--text-2);font-size:14px}
  footer h3{font-family:var(--head);font-size:15px;color:var(--text)}
  .cities{display:flex;flex-wrap:wrap;gap:8px 16px}
  .cities a{color:var(--text-2);text-decoration:none}
  .cities a:hover{color:var(--teal)}
  .legal{margin-top:24px;display:flex;gap:16px}
  .legal a{color:var(--text-3);text-decoration:none}
</style>
</head>
<body>
<header><div class="wrap">
  <a class="brand" href="/">Find Local</a>
  <nav><a href="/">Discover</a><a href="/venues">Venues</a><a href="/blog">Blog</a><a href="/about">About</a></nav>
</div></header>
<main class="wrap">
  <h1>Things to do in ${escapeHtml(cityLabel)}</h1>
  <p class="intro">${
    rows.length > 0
      ? `${rows.length}${rows.length === EVENT_LIMIT ? '+' : ''} upcoming events in ${escapeHtml(city.name)} — concerts, comedy, theater, and community happenings, collected straight from local venue calendars and updated daily.`
      : `No upcoming events listed for ${escapeHtml(city.name)} right now — check back soon, listings update daily.`
  }</p>
  ${sections}
  <a class="cta" href="/">Browse all events with filters →</a>
</main>
<footer><div class="wrap">
  <h3>Events in other cities</h3>
  <div class="cities">${otherCities}</div>
  <div class="legal"><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
</div></footer>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
