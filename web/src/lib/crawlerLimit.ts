// Crawler blocking for the site Worker. Cloudflare's dashboard rules count per
// client IP (free plan), which never triggers for crawlers that fan out across
// dozens of addresses at ~1 req/min each (Meta's meta-externalagent did ~51k
// req/day from 70+ IPv6 /64s in Sept 2026 — a third of all traffic, all of it
// D1 reads). The Worker checks the user agent instead, before the edge cache
// and before D1, so blocked fetches cost nothing.
//
// Only crawlers listed here are blocked; search/answer-engine bots we want
// indexing us (Googlebot, OAI-SearchBot, ClaudeBot …) are deliberately absent.
// facebookexternalhit (link previews when someone shares a URL) is also kept.

const BLOCKED_CRAWLERS = ['meta-externalagent'];

/** True when the request comes from a crawler we refuse to serve. */
export function isBlockedCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BLOCKED_CRAWLERS.some((name) => ua.includes(name));
}

/** 403 for a blocked crawler. Uncacheable and noindex. */
export function blockedCrawlerResponse(): Response {
  return new Response('Forbidden: this crawler is not permitted', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
