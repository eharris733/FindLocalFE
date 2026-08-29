// Legacy route removed in the "massive simplifications" cleanup. Serve 410 +
// noindex so crawlers drop it instead of soft-404ing on the SPA shell.

import { Env, goneResponse } from '../_shared';

export async function onRequest(context: { env: Env; request: Request }) {
  return goneResponse(context.env, context.request.url, 410);
}
