// The developer-API key gate. Runs in middleware BEFORE the edge cache so a cache
// HIT can never hand paid data to an unauthenticated caller, and so every
// authorized call is metered by Unkey (cost: 1) regardless of cache state.
//
// Fails CLOSED: a missing root-key config or an Unkey outage returns 503 rather
// than letting requests through un-metered. Better to be briefly unavailable than
// to give away the paid product.
import { verifyUnkeyKey } from '@findlocal/shared';
import { getEnv } from './db.js';

const SIGNUP_URL = 'https://findlocal.community/developers/pricing';

export type AuthResult =
  | { ok: true; customerId?: string; keyId?: string }
  | { ok: false; response: Response };

/** Bearer token, or `x-api-key`, whichever is present. */
function readKey(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, '').trim() || null;
  const x = request.headers.get('x-api-key');
  return x?.trim() || null;
}

function fail(status: number, error: string, extra: Record<string, string> = {}): AuthResult {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'private, no-store',
        ...extra,
      },
    }),
  };
}

export async function requireApiKey(request: Request): Promise<AuthResult> {
  const env = getEnv();
  if (!env.UNKEY_ROOT_KEY) return fail(503, 'API authentication is not configured');

  const key = readKey(request);
  if (!key) {
    return fail(401, `An API key is required. Get one at ${SIGNUP_URL}`, {
      'WWW-Authenticate': 'Bearer realm="findlocal-api"',
    });
  }

  const v = await verifyUnkeyKey({ rootKey: env.UNKEY_ROOT_KEY, apiBase: env.UNKEY_API_BASE, key, cost: 1 });
  if (v.valid) return { ok: true, customerId: v.externalId, keyId: v.keyId };
  if (v.code === 'UPSTREAM_ERROR') return fail(503, 'API authentication is temporarily unavailable');
  if (v.code === 'RATE_LIMITED') return fail(429, 'Rate limit exceeded', { 'Retry-After': '60' });
  if (v.code === 'USAGE_EXCEEDED') {
    return fail(429, `Monthly quota exceeded. Upgrade at ${SIGNUP_URL}`, { 'Retry-After': '60' });
  }
  return fail(401, 'Invalid, expired, or disabled API key');
}
