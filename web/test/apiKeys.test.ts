import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createKey, listKeys, revokeKey, activeKeyCount, MAX_KEYS_PER_ACCOUNT, KeyLimitError } from '../src/lib/apiKeys.js';
import type { WebEnv } from '../src/lib/db.js';

const webEnv = { AUTH_DB: env.AUTH_DB, UNKEY_ROOT_KEY: 'unkey_root', UNKEY_API_ID: 'api_1' } as unknown as WebEnv;
const USER = { id: 'user_1', plan: 'pro' };
const PLAINTEXT = 'fl_live_abcdef0123456789';

/** Route Unkey admin calls by path; count how many keys were minted so each gets a
 * distinct keyId (the api_key row id is a uuid regardless). */
function stubUnkey() {
  let minted = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/v2/keys.createKey')) {
        minted += 1;
        return new Response(JSON.stringify({ data: { keyId: `key_${minted}`, key: PLAINTEXT } }), { status: 200 });
      }
      // identities.createIdentity / updateIdentity / keys.updateKey (revoke)
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }),
  );
}

async function resetAndSeed(id: string) {
  await env.AUTH_DB.prepare('delete from api_key').run();
  await env.AUTH_DB.prepare('delete from user').run();
  const now = new Date().toISOString();
  await env.AUTH_DB.prepare(
    "insert into user (id, name, email, emailVerified, createdAt, updatedAt, plan) values (?, ?, ?, 0, ?, ?, 'free')",
  )
    .bind(id, 'Test', `${id}@example.com`, now, now)
    .run();
}

beforeEach(async () => {
  stubUnkey();
  await resetAndSeed(USER.id);
});
afterEach(() => vi.unstubAllGlobals());

describe('apiKeys', () => {
  it('mints a key, returns the plaintext once, and stores only display metadata', async () => {
    const { key, row } = await createKey(webEnv, env.AUTH_DB, USER, 'production');
    expect(key).toBe(PLAINTEXT);
    expect(row.name).toBe('production');
    expect(row.prefix).toBe(PLAINTEXT.slice(0, 7));
    expect(row.lastFour).toBe(PLAINTEXT.slice(-4));

    // Plaintext must never be persisted — only prefix + last four.
    const stored = await env.AUTH_DB.prepare('select * from api_key where user_id = ?').bind(USER.id).all();
    const serialized = JSON.stringify(stored.results);
    expect(serialized).not.toContain(PLAINTEXT);
    expect(serialized).toContain(PLAINTEXT.slice(-4));
    expect(await activeKeyCount(env.AUTH_DB, USER.id)).toBe(1);
  });

  it('lists keys newest first and excludes revoked from the active count', async () => {
    await createKey(webEnv, env.AUTH_DB, USER, 'one');
    const second = await createKey(webEnv, env.AUTH_DB, USER, 'two');
    let keys = await listKeys(env.AUTH_DB, USER.id);
    expect(keys.map((k) => k.name)).toEqual(['two', 'one']);

    const revoked = await revokeKey(webEnv, env.AUTH_DB, USER, second.row.id);
    expect(revoked).toBe(true);
    expect(await activeKeyCount(env.AUTH_DB, USER.id)).toBe(1);
    // Still listed (history), but marked revoked.
    keys = await listKeys(env.AUTH_DB, USER.id);
    expect(keys.find((k) => k.id === second.row.id)?.revokedAt).toBeTruthy();
  });

  it('enforces the per-account key cap', async () => {
    for (let i = 0; i < MAX_KEYS_PER_ACCOUNT; i++) await createKey(webEnv, env.AUTH_DB, USER, `k${i}`);
    await expect(createKey(webEnv, env.AUTH_DB, USER, 'one-too-many')).rejects.toBeInstanceOf(KeyLimitError);
  });

  it("won't revoke a key belonging to another user", async () => {
    const { row } = await createKey(webEnv, env.AUTH_DB, USER, 'mine');
    const revoked = await revokeKey(webEnv, env.AUTH_DB, { id: 'someone_else' }, row.id);
    expect(revoked).toBe(false);
    expect(await activeKeyCount(env.AUTH_DB, USER.id)).toBe(1);
  });
});
