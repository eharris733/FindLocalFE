// Shared helpers for the Pages Functions that server-render SEO meta into
// the SPA shell. Files prefixed with "_" are not routed by Cloudflare Pages.

export interface Env {
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  ASSETS: { fetch: (request: Request | string | URL) => Promise<Response> };
}

/** Canonical origin for every URL we publish — never the request's host. */
export const ORIGIN = 'https://findlocal.community';

function supabaseHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
  };
}

/** Minimal PostgREST fetch — avoids bundling supabase-js into every function. */
export async function supabaseSelect<T>(
  env: Env,
  table: string,
  params: string
): Promise<T[] | null> {
  const url = `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, { headers: supabaseHeaders(env) });
  if (!res.ok) return null;
  return (await res.json()) as T[];
}

/**
 * Paginated PostgREST fetch. The server caps every response at 1000 rows no
 * matter what `limit=` says, so anything bigger must walk Range windows.
 * `from`/`to` are inclusive row offsets.
 */
export async function supabaseSelectRange<T>(
  env: Env,
  table: string,
  params: string,
  from: number,
  to: number
): Promise<T[] | null> {
  const url = `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: { ...supabaseHeaders(env), Range: `${from}-${to}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as T[];
}

/** Row count for a PostgREST filter without fetching rows. */
export async function supabaseCount(
  env: Env,
  table: string,
  params: string
): Promise<number | null> {
  const url = `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${params}&select=id`;
  const res = await fetch(url, {
    method: 'HEAD',
    headers: { ...supabaseHeaders(env), Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) return null;
  const total = res.headers.get('content-range')?.split('/')[1];
  const parsed = total ? parseInt(total, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Value of one cookie from the request, decoded; null when absent. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fetch the exported SPA shell (dist/index.html) from static assets. */
export async function fetchShell(env: Env, requestUrl: string): Promise<string> {
  const res = await env.ASSETS.fetch(new URL('/index.html', requestUrl));
  return await res.text();
}

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  /** Emit a robots noindex (used with 404/410 responses). */
  noindex?: boolean;
  /** Serialized JSON-LD object appended to <head>. */
  jsonLd?: object;
}

function upsertTag(html: string, pattern: RegExp, replacement: string): string {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', `${replacement}\n</head>`);
}

/**
 * Rewrite the shell's head for one page: title, description, canonical,
 * Open Graph / Twitter tags, robots and optional JSON-LD. Everything is
 * duplicated client-side for in-app navigation; this makes the *initial*
 * HTML unique per URL so crawlers stop seeing 10k copies of the homepage.
 */
export function applyMeta(html: string, meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description.slice(0, 300));
  const canonical = escapeHtml(meta.canonical);

  let out = html;
  out = upsertTag(out, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  out = upsertTag(
    out,
    /<meta name="description"[^>]*\/?>/,
    `<meta name="description" content="${description}" />`
  );
  out = upsertTag(
    out,
    /<link rel="canonical"[^>]*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  out = upsertTag(
    out,
    /<meta name="robots"[^>]*\/?>/,
    `<meta name="robots" content="${meta.noindex ? 'noindex, follow' : 'index, follow'}" />`
  );

  const ogPairs: Array<[string, string]> = [
    ['og:title', title],
    ['og:description', description],
    ['og:url', canonical],
  ];
  const twitterPairs: Array<[string, string]> = [
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:url', canonical],
  ];
  if (meta.image) {
    const image = escapeHtml(meta.image);
    ogPairs.push(['og:image', image]);
    twitterPairs.push(['twitter:image', image]);
  }
  for (const [prop, content] of ogPairs) {
    out = upsertTag(
      out,
      new RegExp(`<meta property="${prop}"[^>]*\\/?>`),
      `<meta property="${prop}" content="${content}" />`
    );
  }
  for (const [name, content] of twitterPairs) {
    out = upsertTag(
      out,
      new RegExp(`<meta name="${name}"[^>]*\\/?>`),
      `<meta name="${name}" content="${content}" />`
    );
  }

  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    out = out.replace(
      '</head>',
      `<script type="application/ld+json">${json}</script>\n</head>`
    );
  }

  return out;
}

export function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Successful pages revalidate hourly at the edge; dead URLs can be
      // cached longer — their status won't change back.
      'Cache-Control':
        status === 200
          ? 'public, max-age=300, s-maxage=3600'
          : 'public, max-age=3600, s-maxage=86400',
    },
  });
}

/**
 * Strip HTML tags, decode common entities and collapse whitespace so scraped
 * descriptions read as one clean sentence in meta tags. Mirrors the client's
 * src/utils/formatDescription.ts (functions bundle separately, so no import).
 */
export function cleanMetaDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  };
  const text = raw
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16) || 32))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10) || 32))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0 ? text : null;
}

/**
 * Today in YYYY-MM-DD, Eastern time. Events are US-local; the previous UTC
 * version flipped tonight's events to "expired" 5–8 hours early. en-CA
 * formats as ISO.
 */
export function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

/** PageMeta for a fixed route: absolute, query-free canonical. */
export function staticPageMeta(path: string, title: string, description: string): PageMeta {
  return { title, description, canonical: `${ORIGIN}${path}` };
}

/**
 * Noindexed shell at 404/410 for routes that no longer (or never did) exist.
 * The shell still renders whatever the SPA shows humans for the path.
 */
export async function goneResponse(
  env: Env,
  requestUrl: string,
  status: 404 | 410
): Promise<Response> {
  const shell = await fetchShell(env, requestUrl);
  const path = new URL(requestUrl).pathname;
  return htmlResponse(
    applyMeta(shell, {
      title: 'Page not available | Find Local',
      description: 'This page is no longer available. Browse upcoming local events on Find Local.',
      canonical: `${ORIGIN}${path}`,
      noindex: true,
    }),
    status
  );
}
