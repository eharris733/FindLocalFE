import { Env, applyMeta, fetchShell, htmlResponse, staticPageMeta } from './_shared';

export async function onRequest(context: { env: Env; request: Request }) {
  const shell = await fetchShell(context.env, context.request.url);
  return htmlResponse(
    applyMeta(
      shell,
      staticPageMeta('/terms', 'Terms of Service | Find Local', 'Terms of service for using Find Local.')
    ),
    200
  );
}
