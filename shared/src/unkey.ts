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

/**
 * The per-key body: monthly credits (the quota) + optionally a per-key burst
 * ratelimit and the plan in meta.
 *
 * Multi-key accounts (the developer portal) keep the burst ratelimit on the
 * Unkey *identity* (externalId = account id) so it is SHARED across all of an
 * account's keys — see {@link setIdentityRatelimits}. Those keys are minted with
 * `perKeyRatelimit = false`. The monthly quota stays per-key for now; a single
 * shared monthly POOL across keys needs Unkey identity-level credits / a
 * long-window ratelimit, which is a deferred spike — flip that here + in
 * setIdentityRatelimits when verified.
 */
function keyLimitBody(limits: KeyLimits, perKeyRatelimit = true) {
  const body: Record<string, unknown> = {
    // Unkey requires `refillDay` (1–31) when the refill interval is monthly; the
    // quota tops back up on the 1st of each month.
    credits: { remaining: limits.monthlyQuota, refill: { interval: 'monthly' as const, amount: limits.monthlyQuota, refillDay: 1 } },
    meta: { plan: limits.plan },
  };
  if (perKeyRatelimit) {
    body.ratelimits = [{ name: 'requests', limit: limits.perMinuteLimit, duration: 60_000, autoApply: true }];
  }
  return body;
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

/**
 * Mint a new key. `externalId` ties it to the account's Unkey identity (so the
 * identity's shared ratelimit applies). Portal keys pass `perKeyRatelimit=false`
 * because the burst cap lives on the identity, shared across the account's keys.
 */
export async function createUnkeyKey(
  a: UnkeyAdmin,
  opts: { externalId: string; name?: string; limits: KeyLimits; perKeyRatelimit?: boolean },
): Promise<{ keyId: string; key: string }> {
  const d = await adminPost(a, '/v2/keys.createKey', {
    apiId: a.apiId,
    externalId: opts.externalId,
    name: opts.name,
    ...keyLimitBody(opts.limits, opts.perKeyRatelimit ?? false),
  });
  return { keyId: String(d.keyId), key: String(d.key) };
}

/** Move an existing key to a new plan's credits (subscription upgrade/downgrade).
 * Rate lives on the identity for portal keys, so no per-key ratelimit by default. */
export function updateUnkeyKeyLimits(
  a: UnkeyAdmin,
  keyId: string,
  limits: KeyLimits,
  perKeyRatelimit = false,
): Promise<Record<string, any>> {
  return adminPost(a, '/v2/keys.updateKey', { keyId, ...keyLimitBody(limits, perKeyRatelimit) });
}

// --- Identities: one per account (externalId = user id). The identity carries a
// SHARED ratelimit applied to every key linked to it, so an account's many keys
// share one burst cap. Enforced atomically by Unkey on verify (autoApply). -----

/** Shared per-minute burst cap for all of an account's keys. */
export function identityRatelimits(perMinuteLimit: number) {
  return [{ name: 'requests', limit: perMinuteLimit, duration: 60_000, autoApply: true }];
}

/** Upsert an account's Unkey identity and set its shared ratelimit + plan meta.
 * Safe to call before any key exists (accounts-first): creates the identity, or
 * updates it if it already exists. */
export async function setIdentityRatelimits(
  a: UnkeyAdmin,
  opts: { externalId: string; perMinuteLimit: number; plan: string },
): Promise<void> {
  const ratelimits = identityRatelimits(opts.perMinuteLimit);
  const meta = { plan: opts.plan };
  try {
    // createIdentity keys the identity by `externalId`.
    await adminPost(a, '/v2/identities.createIdentity', { externalId: opts.externalId, ratelimits, meta });
  } catch {
    // Already exists (or a create race) → update in place. updateIdentity keys the
    // identity by `identity` (which accepts the externalId), NOT `externalId`, and
    // replaces the full ratelimits + meta with what we send.
    await adminPost(a, '/v2/identities.updateIdentity', { identity: opts.externalId, ratelimits, meta });
  }
}

/** Read an account's identity (its configured ratelimits + meta), or null. */
export async function getIdentity(a: UnkeyAdmin, externalId: string): Promise<Record<string, any> | null> {
  try {
    return await adminPost(a, '/v2/identities.getIdentity', { externalId });
  } catch {
    return null;
  }
}

export interface UnkeyKeyInfo {
  /** Remaining monthly credits, or null for an unmetered key. */
  remaining: number | null;
  /** Plan id from the key's meta (set at mint time), when present. */
  plan?: string;
  /** False once the key is revoked. */
  enabled: boolean;
}

/**
 * Read a key's current state by id (v2 `POST /v2/keys.getKey`). Read-only: unlike
 * `verifyUnkeyKey` it needs no plaintext and deducts NO credit, so it's safe for a
 * dashboard that shows remaining quota. Server-side only (root key).
 */
export async function getUnkeyKey(a: UnkeyAdmin, keyId: string): Promise<UnkeyKeyInfo> {
  const d = await adminPost(a, '/v2/keys.getKey', { keyId });
  return {
    remaining: d.credits?.remaining ?? null,
    plan: typeof d.meta?.plan === 'string' ? d.meta.plan : undefined,
    enabled: d.enabled !== false,
  };
}

/** Disable a key (subscription cancelled). */
export function revokeUnkeyKey(a: UnkeyAdmin, keyId: string): Promise<Record<string, any>> {
  return adminPost(a, '/v2/keys.updateKey', { keyId, enabled: false });
}
