// Server-rendered first screen of the homepage feed (mobile only).
//
// The SPA paints nothing until its ~440 KB bundle has downloaded, executed and
// fetched the feed — on a throttled phone that put LCP near 19 s. This renders
// the first FEED_LIMIT cards as plain HTML (same layout/colours as EventCard)
// so the browser has real content, and the first image is discoverable from
// the <head>. EventFeed removes the fragment right after React's first commit,
// which paints the same rows from window.__FEED_PRELOAD__.
//
// Underscore prefix keeps this file unrouted. Keep the card markup in step
// with src/components/EventCard.tsx and the header with Header.tsx (mobile).

import { escapeHtml } from './_shared';

export const FEED_LIMIT = 12;
/** Rows to pull before sorting — must cover every event on the first day(s)
 * because PostgREST can only order by the raw timestamp (see sortFeedRows). */
export const FEED_FETCH_LIMIT = 200;

/** Same columns as EVENT_LIST_COLUMNS in src/api/events.ts (no spaces for the URL). */
export const FEED_EVENT_COLUMNS =
  'id,title,event_date,start_time,end_time,image_url,venue_id,city,region,event_type,price,price_amount,custom_location';
/** Same columns as VENUE_COLUMNS in src/api/venues.ts. */
export const FEED_VENUE_COLUMNS =
  'id,name,city,region,address,description,image,type,url,latitude,longitude,venue_size,event_types';

export interface FeedEventRow {
  id: string;
  title: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  image_url: string | null;
  venue_id: string | null;
  city: string;
  region: string | null;
  event_type: string[] | null;
  price: string | null;
  price_amount: number | null;
  custom_location: string | null;
}

export interface FeedVenueRow {
  id: string;
  name: string | null;
  image: string | null;
  [key: string]: unknown;
}

/** Below this width the SPA shows the mobile layout the fragment mirrors. */
const DESKTOP_MIN_WIDTH = 1024;

// Material Symbols Outlined paths (viewBox 0 -960 960 960), same as Icon.web.tsx.
const ICON_MAP = 'm612-120-263-93-179 71q-17 9-33.5-1T120-173v-558q0-13 7.5-23t19.5-15l202-71 263 92 178-71q17-8 33.5 1.5T840-788v565q0 11-7.5 19T814-192l-202 72Zm-34-75v-505l-196-66v505l196 66Zm60 0 142-47v-512l-142 54v505Zm-458-12 142-54v-505l-142 47v512Zm458-493v505-505Zm-316-66v505-505Z';
const ICON_BOOKMARK = 'M200-120v-665q0-24 18-42t42-18h440q24 0 42 18t18 42v665L480-240 200-120Zm60-91 220-93 220 93v-574H260v574Zm0-574h440-440Z';
const ICON_LOCATION = 'M480.09-490q28.91 0 49.41-20.59 20.5-20.59 20.5-49.5t-20.59-49.41q-20.59-20.5-49.5-20.5t-49.41 20.59q-20.5 20.59-20.5 49.5t20.59 49.41q20.59 20.5 49.5 20.5ZM480-159q133-121 196.5-219.5T740-552q0-117.79-75.29-192.9Q589.42-820 480-820t-184.71 75.1Q220-669.79 220-552q0 75 65 173.5T480-159Zm0 79Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z';
const ICON_CALENDAR = 'M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Zm300 230q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z';

const CATEGORY_GLYPHS: Array<[RegExp, string]> = [
  [/music|concert|dj|band|karaoke/i, '🎵'],
  [/comedy|open.?mic|improv|stand.?up/i, '🎤'],
  [/art|theater|theatre|dance|drag/i, '🎭'],
  [/film|movie|cinema/i, '🎬'],
  [/trivia|quiz|game|bingo/i, '🎲'],
  [/food|drink|beer|wine|market/i, '🍻'],
];

function categoryGlyph(types: string[] | null): string | null {
  for (const t of types ?? []) {
    const hit = CATEGORY_GLYPHS.find(([re]) => re.test(t));
    if (hit) return hit[1];
  }
  return null;
}

/**
 * event_date is a timestamptz stamped inconsistently (T00:00Z or T23:00Z) that
 * means a calendar day; its UTC date part is the intended day in every
 * variant. Same comparator as compareEventsByDayTime in src/utils/eventDate.ts
 * so the static first screen equals the client's first rows.
 */
export function sortFeedRows<T extends FeedEventRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const day = (a.event_date ?? '').slice(0, 10).localeCompare((b.event_date ?? '').slice(0, 10));
    if (day !== 0) return day;
    const time = (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99');
    if (time !== 0) return time;
    return a.id.localeCompare(b.id);
  });
}

function svg(path: string, size: number, cls: string): string {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 -960 960 960" aria-hidden="true"><path d="${path}"/></svg>`;
}

function formatTime(time: string | null): string | null {
  if (!time || !time.includes(':')) return null;
  const [hs, ms] = time.split(':');
  const h = parseInt(hs, 10);
  const m = parseInt(ms, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const pm = h >= 12;
  const display = pm ? (h === 12 ? 12 : h - 12) : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`;
}

/** "TUE · SEP 2 · 7:30 PM", matching EventCard's `EEE · MMM d` label. */
function formatDateLabel(e: FeedEventRow): string {
  if (!e.event_date) return '';
  const d = new Date(`${e.event_date.slice(0, 10)}T12:00:00`);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const datePart = `${weekday} · ${month} ${d.getDate()}`.toUpperCase();
  const time = formatTime(e.start_time);
  return time ? `${datePart} · ${time}` : datePart;
}

function formatPrice(e: FeedEventRow): string {
  if (e.price_amount === 0) return 'Free';
  if (e.price) return e.price;
  if (e.price_amount && e.price_amount > 0) return `$${e.price_amount}`;
  return '';
}

function isHttpUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

const CSS = `
#ssr-feed{position:fixed;inset:0;z-index:1;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#FFFFFF;color:#111827;
  font-family:Manrope_400Regular,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
#ssr-feed *{box-sizing:border-box}
#ssr-feed .hd{position:sticky;top:0;z-index:2;height:64px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:#FFFFFF;border-bottom:1px solid #E5E7EB}
#ssr-feed .hd .l,#ssr-feed .hd .r{min-width:80px;display:flex;align-items:center}
#ssr-feed .hd .r{justify-content:flex-end}
#ssr-feed .pill{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #E5E7EB;border-radius:9999px;color:#006565;font:500 14px/20px Manrope_500Medium,-apple-system,sans-serif;font-weight:600;text-decoration:none}
#ssr-feed .pill svg,#ssr-feed .ib svg{fill:#006565}
#ssr-feed .ib{width:40px;height:40px;border:1px solid #E5E7EB;border-radius:9999px;display:flex;align-items:center;justify-content:center}
#ssr-feed .logo{display:block;width:180px;height:50px;object-fit:contain}
#ssr-feed .list{padding:20px 20px 96px}
#ssr-feed .card{display:block;margin-bottom:24px;color:inherit;text-decoration:none}
#ssr-feed .img{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#F3F4F6;display:flex;align-items:center;justify-content:center}
#ssr-feed .img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#ssr-feed .img .ph{font-size:40px;line-height:48px}
#ssr-feed .img .ph svg{fill:#9CA3AF}
#ssr-feed .price{position:absolute;top:8px;right:8px;padding:4px 12px;border-radius:9999px;background:rgba(255,255,255,.9);color:#111827;font:600 12px/16px Manrope_400Regular,-apple-system,sans-serif}
#ssr-feed .body{padding:8px 4px 0}
#ssr-feed .date{margin:0 0 4px;color:#EC7C35;font:700 12px/16px Manrope_400Regular,-apple-system,sans-serif;letter-spacing:.4px;text-transform:uppercase}
#ssr-feed .title{margin:0 0 4px;color:#111827;font:20px/32px Epilogue_600SemiBold,-apple-system,sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#ssr-feed .loc{display:flex;align-items:center;color:#4B5563;font:14px/20px Manrope_400Regular,-apple-system,sans-serif}
#ssr-feed .loc svg{fill:#9CA3AF;flex-shrink:0}
#ssr-feed .loc span{margin-left:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (min-width:${DESKTOP_MIN_WIDTH}px){#ssr-feed{display:none}}
@media (prefers-color-scheme:dark){
  #ssr-feed{background:#111827;color:#F9FAFB}
  #ssr-feed .hd{background:#111827;border-bottom-color:#374151}
  #ssr-feed .pill,#ssr-feed .ib{border-color:#374151;color:#63BAAB}
  #ssr-feed .pill svg,#ssr-feed .ib svg{fill:#63BAAB}
  #ssr-feed .img{background:#0B1220}
  #ssr-feed .price{background:rgba(17,24,39,.9);color:#F9FAFB}
  #ssr-feed .title{color:#F9FAFB}
  #ssr-feed .loc{color:#E5E7EB}
}`;

function cardImage(e: FeedEventRow, venue: FeedVenueRow | undefined): string | null {
  return isHttpUrl(e.image_url) ? e.image_url : isHttpUrl(venue?.image) ? venue!.image! : null;
}

function renderCard(e: FeedEventRow, venue: FeedVenueRow | undefined, index: number, lcpIndex: number): string {
  const image = cardImage(e, venue);
  const glyph = categoryGlyph(e.event_type);
  const price = formatPrice(e);
  const date = formatDateLabel(e);
  const venueName = venue?.name ?? e.custom_location ?? '';
  const location = [venueName, e.region].filter(Boolean).join(' · ');
  const title = e.title ?? '';

  // The first card that has an image is the LCP candidate: fetch it at high
  // priority, never lazily (it's also preloaded from <head>). The next one is
  // usually still in the viewport; everything after is lazy.
  const imgAttrs =
    index === lcpIndex
      ? 'fetchpriority="high" decoding="async"'
      : index <= lcpIndex + 1
        ? 'decoding="async"'
        : 'loading="lazy" decoding="async"';

  return `<a class="card" href="/event/${escapeHtml(e.id)}">
<div class="img">${
    glyph ? `<span class="ph">${glyph}</span>` : `<span class="ph">${svg(ICON_CALENDAR, 40, '')}</span>`
  }${image ? `<img src="${escapeHtml(image)}" alt="" ${imgAttrs}>` : ''}${
    price ? `<span class="price">${escapeHtml(price)}</span>` : ''
  }</div>
<div class="body">${date ? `<p class="date">${escapeHtml(date)}</p>` : ''}${
    title ? `<p class="title">${escapeHtml(title)}</p>` : ''
  }${location ? `<div class="loc">${svg(ICON_LOCATION, 14, '')}<span>${escapeHtml(location)}</span></div>` : ''}</div>
</a>`;
}

export interface FeedFragment {
  headHtml: string;
  bodyHtml: string;
}

/**
 * HTML for the first screen. `events` must already be the client's first
 * rows for `city` (same filter + order as getEventsPage in src/api/events.ts).
 */
export function renderFeedFragment(
  city: string,
  today: string,
  events: FeedEventRow[],
  venues: FeedVenueRow[]
): FeedFragment {
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const venueFor = (e: FeedEventRow) => (e.venue_id ? venueById.get(e.venue_id) : undefined);
  const lcpIndex = events.findIndex((e) => cardImage(e, venueFor(e)) !== null);
  const lcpImage = lcpIndex >= 0 ? cardImage(events[lcpIndex], venueFor(events[lcpIndex])) : null;

  const preload = JSON.stringify({ city, today, events, venues }).replace(/</g, '\\u003c');

  const headHtml =
    (lcpImage
      ? `<link rel="preload" as="image" href="${escapeHtml(lcpImage)}" fetchpriority="high" />\n`
      : '') + `<script>window.__FEED_PRELOAD__=${preload};</script>`;

  const cards = events.map((e, i) => renderCard(e, venueFor(e), i, lcpIndex)).join('\n');

  const bodyHtml = `<div id="ssr-feed" aria-label="Upcoming events in ${escapeHtml(city)}">
<style>${CSS}</style>
<header class="hd">
  <div class="l"><a class="pill" href="/?view=map">${svg(ICON_MAP, 18, '')}<span>Map</span></a></div>
  <a href="/" aria-label="Find Local"><img class="logo" src="/logo.webp" width="180" height="50" alt="Find Local" fetchpriority="high"></a>
  <div class="r"><a class="ib" href="/saved" aria-label="Saved events">${svg(ICON_BOOKMARK, 20, '')}</a></div>
</header>
<main class="list">
${cards}
</main>
</div>`;

  return { headHtml, bodyHtml };
}
