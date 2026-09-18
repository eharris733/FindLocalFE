// Multiple named API keys per portal account. Unkey holds the real key + metering;
// the api_key table (AUTH_DB) stores only display metadata + the Unkey key id so we
// can list and revoke. Plaintext is returned once at creation and never stored.
//
// All of an account's keys share ONE burst ratelimit via the account's Unkey
// identity (externalId = user.id); the monthly quota is per-key for now (see
// shared/src/unkey.ts). We cap active keys per account to bound quota multiplication
// until a single shared monthly pool lands.
import type { D1Database } from '@cloudflare/workers-types';
import { createUnkeyKey, revokeUnkeyKey, setIdentityRatelimits } from '@findlocal/shared';
import type { WebEnv } from './db.js';
import { admin, limitsFor } from './billing.js';
import { PLAN_BY_ID, type PlanId } from './plans.js';

export const MAX_KEYS_PER_ACCOUNT = 5;

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string | null;
  lastFour: string | null;
  plan: string | null;
  createdAt: number;
  revokedAt: number | null;
  unkeyKeyId: string;
}

export interface AccountUser {
  id: string;
  plan?: string;
}

function planFor(user: AccountUser) {
  return PLAN_BY_ID.get((user.plan as PlanId) ?? 'free') ?? PLAN_BY_ID.get('free')!;
}

function unkeyConfigured(env: WebEnv): boolean {
  return !!(env.UNKEY_ROOT_KEY && env.UNKEY_API_ID);
}

/** All keys for an account, newest first (includes revoked, for history). */
export async function listKeys(db: D1Database, userId: string): Promise<ApiKeyRow[]> {
  const res = await db
    .prepare(
      `select id, name, prefix, last_four, plan, created_at, revoked_at, unkey_key_id
         from api_key where user_id = ? order by created_at desc, rowid desc`,
    )
    .bind(userId)
    .all<{
      id: string;
      name: string;
      prefix: string | null;
      last_four: string | null;
      plan: string | null;
      created_at: number;
      revoked_at: number | null;
      unkey_key_id: string;
    }>();
  return res.results.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    lastFour: r.last_four,
    plan: r.plan,
    createdAt: r.created_at,
    revokedAt: r.revoked_at,
    unkeyKeyId: r.unkey_key_id,
  }));
}

export async function activeKeyCount(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare('select count(*) as n from api_key where user_id = ? and revoked_at is null')
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export class KeyLimitError extends Error {}

/** Mint a new named key for the account. Returns the plaintext ONCE. */
export async function createKey(
  env: WebEnv,
  db: D1Database,
  user: AccountUser,
  name: string,
): Promise<{ key: string; row: ApiKeyRow }> {
  if (!unkeyConfigured(env)) throw new Error('Unkey is not configured');
  const trimmed = name.trim().slice(0, 60) || 'API key';

  if ((await activeKeyCount(db, user.id)) >= MAX_KEYS_PER_ACCOUNT) {
    throw new KeyLimitError(`You can have at most ${MAX_KEYS_PER_ACCOUNT} active keys.`);
  }

  const plan = planFor(user);
  // Ensure the account's identity carries the shared burst ratelimit (idempotent;
  // also covers free-tier accounts that never hit the billing webhook).
  await setIdentityRatelimits(admin(env), {
    externalId: user.id,
    perMinuteLimit: plan.perMinuteLimit,
    plan: plan.id,
  });

  const { keyId, key } = await createUnkeyKey(admin(env), {
    externalId: user.id,
    name: `${plan.id}:${trimmed}`,
    limits: limitsFor(plan),
  });

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const prefix = key.slice(0, 7);
  const lastFour = key.slice(-4);
  await db
    .prepare(
      `insert into api_key (id, user_id, unkey_key_id, name, prefix, last_four, plan, created_at, revoked_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, null)`,
    )
    .bind(id, user.id, keyId, trimmed, prefix, lastFour, plan.id, createdAt)
    .run();

  return {
    key,
    row: { id, name: trimmed, prefix, lastFour, plan: plan.id, createdAt, revokedAt: null, unkeyKeyId: keyId },
  };
}

/** Revoke one of the account's keys (Unkey disable + mark revoked). No-op if the
 * id doesn't belong to this user or is already revoked. */
export async function revokeKey(
  env: WebEnv,
  db: D1Database,
  user: AccountUser,
  id: string,
): Promise<boolean> {
  const row = await db
    .prepare('select unkey_key_id from api_key where id = ? and user_id = ? and revoked_at is null')
    .bind(id, user.id)
    .first<{ unkey_key_id: string }>();
  if (!row) return false;
  if (unkeyConfigured(env)) await revokeUnkeyKey(admin(env), row.unkey_key_id);
  await db.prepare('update api_key set revoked_at = ? where id = ?').bind(Date.now(), id).run();
  return true;
}
