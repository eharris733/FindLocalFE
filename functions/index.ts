// Server-rendered canonical for the homepage. Every query variant
// (/?view=map, /?city=Boston, utm params…) serves this same head with a bare
// "/" canonical, which is what collapses the duplicate-URL cluster in Search
// Console. Keep the copy in sync with scripts/inject-head.js.

import { Env, applyMeta, fetchShell, htmlResponse, staticPageMeta } from './_shared';

export async function onRequest(context: { env: Env; request: Request }) {
  const shell = await fetchShell(context.env, context.request.url);
  return htmlResponse(
    applyMeta(
      shell,
      staticPageMeta(
        '/',
        'Find Local — Discover Local Events: Concerts, Comedy, Theater & More',
        'Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences across 31 US cities. Free and paid events updated daily.'
      )
    ),
    200
  );
}
