import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import { setAccountPlan, resolveUserId } from '../src/lib/accountBilling.js';
import { PLAN_BY_ID } from '../src/lib/plans.js';
import type { WebEnv } from '../src/lib/db.js';

const webEnv = { AUTH_DB: env.AUTH_DB, UNKEY_ROOT_KEY: 'unkey_root', UNKEY_API_ID: 'api_1' } as unknown as WebEnv;
const PRO = PLAN_BY_ID.get('pro')!;
const FREE = PLAN_BY_ID.get('free')!;

async function seedUserWithKey(id: string) {
  await env.AUTH_DB.prepare('delete from api_key').run();
  await env.AUTH_DB.prepare('delete from user').run();
  const now = new Date().toISOString();
  await env.AUTH_DB.prepare(
    "insert into user (id, name, email, emailVerified, createdAt, updatedAt, plan) values (?, ?, ?, 0, ?, ?, 'free')",
  )
    .bind(id, 'Test', `${id}@example.com`, now, now)
    .run();
  await env.AUTH_DB.prepare(
    "insert into api_key (id, user_id, unkey_key_id, name, prefix, last_four, plan, created_at) values ('k1', ?, 'key_1', 'main', 'fl_ab', '1234', 'free', 1)",
  )
    .bind(id)
    .run();
}

let calls: string[] = [];
beforeEach(async () => {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  }));
  await seedUserWithKey('user_1');
});
afterEach(() => vi.unstubAllGlobals());

describe('setAccountPlan', () => {
  it('caches the plan + customer on the user, sets the identity, and re-limits each active key', async () => {
    await setAccountPlan(webEnv, env.AUTH_DB, { userId: 'user_1', stripeCustomerId: 'cus_1', plan: PRO });

    const row = await env.AUTH_DB
      .prepare('select plan, stripeCustomerId from user where id = ?')
      .bind('user_1')
      .first<{ plan: string; stripeCustomerId: string }>();
    expect(row?.plan).toBe('pro');
    expect(row?.stripeCustomerId).toBe('cus_1');

    expect(calls.some((u) => u.includes('identities'))).toBe(true);
    expect(calls.some((u) => u.includes('/v2/keys.updateKey'))).toBe(true);
  });

  it('downgrade to free keeps the key (no revoke) and updates limits', async () => {
    await setAccountPlan(webEnv, env.AUTH_DB, { userId: 'user_1', plan: FREE });
    const row = await env.AUTH_DB.prepare('select plan from user where id = ?').bind('user_1').first<{ plan: string }>();
    expect(row?.plan).toBe('free');
    // still active (not revoked)
    const key = await env.AUTH_DB.prepare('select revoked_at from api_key where id = ?').bind('k1').first<{ revoked_at: number | null }>();
    expect(key?.revoked_at).toBeNull();
  });
});

describe('resolveUserId', () => {
  it('prefers explicit metadata.userId', async () => {
    expect(await resolveUserId(env.AUTH_DB, { metadataUserId: 'user_1' })).toBe('user_1');
  });
  it('falls back to the Stripe customer id', async () => {
    await setAccountPlan(webEnv, env.AUTH_DB, { userId: 'user_1', stripeCustomerId: 'cus_9', plan: PRO });
    expect(await resolveUserId(env.AUTH_DB, { stripeCustomerId: 'cus_9' })).toBe('user_1');
  });
  it('returns null when nothing matches', async () => {
    expect(await resolveUserId(env.AUTH_DB, { stripeCustomerId: 'cus_missing' })).toBeNull();
  });
});
