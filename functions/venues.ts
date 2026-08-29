import { Env, applyMeta, fetchShell, htmlResponse, staticPageMeta } from './_shared';

export async function onRequest(context: { env: Env; request: Request }) {
  const shell = await fetchShell(context.env, context.request.url);
  return htmlResponse(
    applyMeta(
      shell,
      staticPageMeta(
        '/venues',
        'Browse Local Venues | Find Local',
        'Browse music halls, comedy clubs, theaters, and community spaces hosting upcoming events in your city.'
      )
    ),
    200
  );
}
