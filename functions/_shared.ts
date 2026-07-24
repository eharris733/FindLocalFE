// Shared helpers for the Pages Functions that server-render SEO meta into
// the SPA shell. Files prefixed with "_" are not routed by Cloudflare Pages.

export interface Env {
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  ASSETS: { fetch: (request: Request | string | URL) => Promise<Response> };
}

/** Minimal PostgREST fetch — avoids bundling supabase-js into every function. */
export async function supabaseSelect<T>(
  env: Env,
  table: string,
  params: string
): Promise<T[] | null> {
  const url = `${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as T[];
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

/** Today in YYYY-MM-DD, matching how event_date is stored and queried. */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}
