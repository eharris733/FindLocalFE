// Shared helpers for the one-off backfill scrapers (venue-onboard.js,
// event-desc-backfill.js). Regex-based meta extraction — adequate for
// <meta> tags, no HTML parser dependency.

const USER_AGENT =
  'Mozilla/5.0 (compatible; FindLocalBot/1.0; +https://findlocal.community)';

/** Fetch a page's HTML, following redirects. Returns null on any failure. */
async function fetchHtml(url, { timeoutMs = 10000 } = {}) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('html')) return null;
    // Cap at ~2MB so a runaway page can't blow up memory.
    const html = (await res.text()).slice(0, 2_000_000);
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  }
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

/** Decode HTML entities; runs twice so double-encoded values (&amp;#39;) resolve. */
function decodeEntities(raw) {
  let text = raw;
  for (let pass = 0; pass < 2; pass++) {
    text = text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16) || 32))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10) || 32))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
  }
  return text;
}

/** Pull one meta tag's content, tolerating either attribute order. */
function metaContent(html, attr, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${esc}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    // Attribute values are HTML-escaped (&amp; in URLs, &#39; in text) —
    // decode here so both URLs and prose come out usable.
    if (m) return decodeEntities(m[1].trim());
  }
  return null;
}

/** Extract og:/meta description and image candidates from a page. */
function extractMeta(html, finalUrl) {
  const resolve = (url) => {
    if (!url) return null;
    try {
      return new URL(url, finalUrl).toString();
    } catch {
      return null;
    }
  };
  return {
    ogImage: resolve(
      metaContent(html, 'property', 'og:image') ||
        metaContent(html, 'name', 'og:image') ||
        metaContent(html, 'name', 'twitter:image') ||
        metaContent(html, 'property', 'twitter:image')
    ),
    ogDescription:
      metaContent(html, 'property', 'og:description') ||
      metaContent(html, 'name', 'og:description'),
    metaDescription: metaContent(html, 'name', 'description'),
    title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim() || null,
  };
}

/**
 * HEAD-check an image URL: 2xx, image/* content type, plausible size.
 * Some hosts reject HEAD (403/405) — retry with a 1-byte ranged GET.
 */
async function validateImageUrl(url, { timeoutMs = 10000 } = {}) {
  const check = (res) => {
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const len = Number(res.headers.get('content-length'));
    if (Number.isFinite(len) && len > 0 && (len < 1024 || len > 10 * 1024 * 1024)) return false;
    return true;
  };
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': USER_AGENT },
    });
    if (head.status === 403 || head.status === 405) {
      const get = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': USER_AGENT, Range: 'bytes=0-0' },
      });
      get.body?.cancel?.();
      return check(get);
    }
    return check(head);
  } catch {
    return false;
  }
}

/**
 * Same rules as src/utils/formatDescription.ts, plus a length gate: scraped
 * meta descriptions shorter than 40 chars are boilerplate, longer than
 * maxLen get cut at a word boundary.
 */
function cleanDescription(raw, maxLen = 500) {
  if (!raw) return null;
  let text = raw
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16) || 32))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10) || 32))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 40) return null;
  if (text.length > maxLen) {
    const slice = text.slice(0, maxLen);
    text = `${slice.slice(0, Math.max(slice.lastIndexOf(' '), maxLen - 60)).trimEnd()}…`;
  }
  return text;
}

/** Ticketing aggregators — their og:description is sales boilerplate, never venue copy. */
const AGGREGATOR_HOSTS =
  /(^|\.)(ticketmaster|livenation|ticketweb|eventbrite|axs|etix|dice|bandsintown|seatgeek|stubhub|universe|showclix|tixr|seetickets|ticketleap)\.(com|co|fm|us)$/i;

function isAggregatorUrl(url) {
  try {
    return AGGREGATOR_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Sales/SEO boilerplate that should never be shown as a description. */
const BOILERPLATE_PATTERNS = [
  /tickets? at ticketmaster/i,
  /on ticketweb/i,
  /eventbrite/i,
  /venue concert and event schedules/i,
  /^buy .{0,80} tickets/i,
  /^upcoming events at /i,
  /find tickets for/i,
  /browse event info and purchase tickets/i,
  /^(get|find) tickets/i,
  // "10/1/26 @ 8:30 PM - Sphere Suites - ..." suite-listing pages
  /^\d{1,2}\/\d{1,2}\/\d{2,4}\s*@/,
];

function isBoilerplate(text) {
  return BOILERPLATE_PATTERNS.some((p) => p.test(text));
}

/** Escape a string for a single-quoted SQL literal. */
function sqlQuote(str) {
  return `'${String(str).replace(/'/g, "''")}'`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimal CSV field escaping. */
function csvField(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

module.exports = {
  fetchHtml,
  extractMeta,
  validateImageUrl,
  cleanDescription,
  isAggregatorUrl,
  isBoilerplate,
  sqlQuote,
  sleep,
  csvField,
};
