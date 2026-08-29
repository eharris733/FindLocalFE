import { Env, applyMeta, fetchShell, htmlResponse, staticPageMeta } from './_shared';

export async function onRequest(context: { env: Env; request: Request }) {
  const shell = await fetchShell(context.env, context.request.url);
  return htmlResponse(
    applyMeta(
      shell,
      staticPageMeta(
        '/about',
        'About Find Local | Local Event Discovery',
        'Find Local surfaces concerts, comedy, theater, and community events across 31 US cities, scraped directly from venue calendars and updated daily.'
      )
    ),
    200
  );
}
