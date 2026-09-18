import { afterEach, describe, expect, it, vi } from 'vitest';
import { getUnkeyKey } from '../src/unkey.js';

const admin = { rootKey: 'unkey_root', apiId: 'api_1' };

describe('getUnkeyKey', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads a key by id without deducting a credit', async () => {
    let body: any;
    let path = '';
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      path = url;
      body = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ data: { enabled: true, credits: { remaining: 4200 }, meta: { plan: 'pro' } } }), { status: 200 });
    }));

    const info = await getUnkeyKey(admin, 'key_1');
    expect(info).toEqual({ remaining: 4200, plan: 'pro', enabled: true });
    expect(path).toContain('/v2/keys.getKey');
    // Read-only: no credits object in the request (verifyKey would send one).
    expect(body).toEqual({ keyId: 'key_1' });
    expect(body.credits).toBeUndefined();
  });

  it('reports a disabled key and a null remaining for unmetered keys', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ data: { enabled: false } }), { status: 200 })));
    const info = await getUnkeyKey(admin, 'key_2');
    expect(info.enabled).toBe(false);
    expect(info.remaining).toBeNull();
    expect(info.plan).toBeUndefined();
  });

  it('throws on a non-OK Unkey response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'nope' } }), { status: 404 })));
    await expect(getUnkeyKey(admin, 'key_missing')).rejects.toThrow();
  });
});
