/**
 * Canonical web origin. Canonical URLs, og:url, and JSON-LD must always use
 * this — never window.location.origin, which would make www/http/*.pages.dev
 * variants self-canonicalise as duplicates in Search Console.
 */
export const CANONICAL_ORIGIN = 'https://findlocal.community';
