import { Env, applyMeta, fetchShell, htmlResponse, staticPageMeta } from './_shared';

export async function onRequest(context: { env: Env; request: Request }) {
  const shell = await fetchShell(context.env, context.request.url);
  return htmlResponse(
    applyMeta(
      shell,
      staticPageMeta('/privacy', 'Privacy Policy | Find Local', 'How Find Local handles your data.')
    ),
    200
  );
}
