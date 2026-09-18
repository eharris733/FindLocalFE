import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIdentityRatelimits, getIdentity, identityRatelimits } from '../src/unkey.js';

const admin = { rootKey: 'unkey_root', apiId: 'api_1' };

describe('unkey identities', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds a shared per-minute ratelimit', () => {
    expect(identityRatelimits(120)).toEqual([{ name: 'requests', limit: 120, duration: 60_000, autoApply: true }]);
  });

  it('creates the identity with the plan ratelimit + meta', async () => {
    const calls: { url: string; body: any }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }));

    await setIdentityRatelimits(admin, { externalId: 'user_1', perMinuteLimit: 120, plan: 'pro' });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain('/v2/identities.createIdentity');
    expect(calls[0]!.body).toEqual({
      externalId: 'user_1',
      ratelimits: [{ name: 'requests', limit: 120, duration: 60_000, autoApply: true }],
      meta: { plan: 'pro' },
    });
  });

  it('falls back to updateIdentity when the identity already exists', async () => {
    const calls: { url: string; body: any }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      // First call (create) conflicts; second call (update) succeeds.
      if (url.includes('createIdentity')) return new Response(JSON.stringify({ error: { message: 'exists' } }), { status: 409 });
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }));

    await setIdentityRatelimits(admin, { externalId: 'user_1', perMinuteLimit: 30, plan: 'free' });
    const update = calls.find((c) => c.url.includes('updateIdentity'));
    expect(calls.some((c) => c.url.includes('createIdentity'))).toBe(true);
    expect(update).toBeTruthy();
    // updateIdentity keys the identity by `identity` (NOT `externalId`) — sending
    // externalId here 400s ("missing property 'identity'").
    expect(update!.body).toEqual({
      identity: 'user_1',
      ratelimits: [{ name: 'requests', limit: 30, duration: 60_000, autoApply: true }],
      meta: { plan: 'free' },
    });
    expect(update!.body).not.toHaveProperty('externalId');
  });

  it('getIdentity returns null on error instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: {} }), { status: 404 })));
    expect(await getIdentity(admin, 'nope')).toBeNull();
  });
});
