// The single place that talks to Unkey. Verifies a developer API key against the
// v2 endpoint (POST https://api.unkey.com/v2/keys.verifyKey), authenticating with
// the workspace root key as a Bearer token. In v2 the key itself identifies the
// API, so no apiId is sent on verify. Passing `credits.cost` atomically decrements
// the key's remaining quota — this is what makes Unkey (not the old non-atomic KV
// counter) the metering source of truth. Kept as a thin fetch wrapper (no SDK) so
// it bundles cleanly in the Worker and is trivial to mock in tests.

const DEFAULT_BASE = 'https://api.unkey.com';

/** Unkey's `data.code` values we branch on; other strings pass through as-is. */
export type UnkeyCode =
  | 'VALID'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'USAGE_EXCEEDED'
  | 'DISABLED'
  | 'EXPIRED'
  | 'UPSTREAM_ERROR'
  | (string & {});

export interface UnkeyVerifyResult {
  valid: boolean;
  code: UnkeyCode;
  keyId?: string;
  /** identity.externalId — the customer id we carry through as `customerId`. */
  externalId?: string;
  /** Remaining quota after this call, when the key is quota-limited. */
  remaining?: number | null;
  meta?: Record<string, unknown>;
}

export interface VerifyOptions {
  rootKey: string;
  key: string;
  apiBase?: string;
  /** Credits to deduct for this call (1 = one metered request). */
  cost?: number;
  tags?: string[];
}

export async function verifyUnkeyKey(opts: VerifyOptions): Promise<UnkeyVerifyResult> {
  const base = (opts.apiBase || DEFAULT_BASE).replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetch(`${base}/v2/keys.verifyKey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.rootKey}` },
      body: JSON.stringify({
        key: opts.key,
        ...(opts.cost != null ? { credits: { cost: opts.cost } } : {}),
        ...(opts.tags?.length ? { tags: opts.tags } : {}),
      }),
    });
  } catch {
    return { valid: false, code: 'UPSTREAM_ERROR' };
  }
  if (!res.ok) {
    return { valid: false, code: res.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR' };
  }

  const body = (await res.json().catch(() => ({}))) as { data?: Record<string, any> };
  const d = body.data ?? {};
  return {
    valid: !!d.valid,
    code: String(d.code ?? (d.valid ? 'VALID' : 'UNKNOWN')),
    keyId: d.keyId,
    externalId: d.identity?.externalId ?? d.identity?.id,
    remaining: d.credits?.remaining ?? d.remaining ?? null,
    meta: d.meta,
  };
}

// --- Admin operations (used only server-side by the Stripe billing webhook, never
// at request time). All authenticate with the workspace root key. -------------

export interface UnkeyAdmin {
  rootKey: string;
  apiId: string;
  apiBase?: string;
}

/** Plan enforcement facts, translated to Unkey's credits + ratelimit shapes. */
export interface KeyLimits {
  /** Monthly included calls (credits.remaining, refilled monthly). */
  monthlyQuota: number;
  /** Burst ceiling, requests per minute. */
  perMinuteLimit: number;
  /** Plan id, stored in key meta for readback. */
  plan: string;
}

function limitBody(limits: KeyLimits) {
  return {
    // Unkey requires `refillDay` (1–31) when the refill interval is monthly; the
    // quota tops back up on the 1st of each month.
    credits: { remaining: limits.monthlyQuota, refill: { interval: 'monthly' as const, amount: limits.monthlyQuota, refillDay: 1 } },
    ratelimits: [{ name: 'requests', limit: limits.perMinuteLimit, duration: 60_000, autoApply: true }],
    meta: { plan: limits.plan },
  };
}

async function adminPost(a: UnkeyAdmin, path: string, payload: Record<string, unknown>): Promise<Record<string, any>> {
  const base = (a.apiBase || DEFAULT_BASE).replace(/\/+$/, '');
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.rootKey}` },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: Record<string, any>; error?: unknown };
  if (!res.ok) throw new Error(`Unkey ${path} failed (${res.status}): ${JSON.stringify(body.error ?? body)}`);
  return body.data ?? {};
}

/** Mint a new key for a customer. `externalId` ties it to the Stripe customer. */
export async function createUnkeyKey(
  a: UnkeyAdmin,
  opts: { externalId: string; name?: string; limits: KeyLimits },
): Promise<{ keyId: string; key: string }> {
  const d = await adminPost(a, '/v2/keys.createKey', {
    apiId: a.apiId,
    externalId: opts.externalId,
    name: opts.name,
    ...limitBody(opts.limits),
  });
  return { keyId: String(d.keyId), key: String(d.key) };
}

/** Move an existing key to a new plan's limits (subscription upgrade/downgrade). */
export function updateUnkeyKeyLimits(a: UnkeyAdmin, keyId: string, limits: KeyLimits): Promise<Record<string, any>> {
  return adminPost(a, '/v2/keys.updateKey', { keyId, ...limitBody(limits) });
}

/** Disable a key (subscription cancelled). */
export function revokeUnkeyKey(a: UnkeyAdmin, keyId: string): Promise<Record<string, any>> {
  return adminPost(a, '/v2/keys.updateKey', { keyId, enabled: false });
}
