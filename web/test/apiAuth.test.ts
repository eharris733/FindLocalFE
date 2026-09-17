import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the environment accessor and the Unkey call so requireApiKey is tested in
// isolation (no cloudflare:workers env, no network). vi.hoisted keeps the fns
// available to the hoisted vi.mock factories.
const { getEnv, verifyUnkeyKey } = vi.hoisted(() => ({ getEnv: vi.fn(), verifyUnkeyKey: vi.fn() }));
vi.mock('../src/lib/db.js', () => ({ getEnv }));
vi.mock('@findlocal/shared', () => ({ verifyUnkeyKey }));

import { requireApiKey } from '../src/lib/apiAuth.js';

const withKey = (key?: string) =>
  new Request('https://findlocal.community/api/events', {
    headers: key ? { authorization: `Bearer ${key}` } : {},
  });

describe('requireApiKey', () => {
  beforeEach(() => {
    getEnv.mockReset();
    verifyUnkeyKey.mockReset();
    getEnv.mockReturnValue({ UNKEY_ROOT_KEY: 'unkey_root' });
  });

  it('503s when the root key is not configured (fail closed)', async () => {
    getEnv.mockReturnValue({});
    const r = await requireApiKey(withKey('k'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(503);
    expect(verifyUnkeyKey).not.toHaveBeenCalled();
  });

  it('401s with a WWW-Authenticate challenge when no key is sent', async () => {
    const r = await requireApiKey(withKey());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(401);
      expect(r.response.headers.get('WWW-Authenticate')).toContain('Bearer');
    }
    expect(verifyUnkeyKey).not.toHaveBeenCalled();
  });

  it('reads an x-api-key header too', async () => {
    verifyUnkeyKey.mockResolvedValue({ valid: true, code: 'VALID', keyId: 'key_1', externalId: 'cus_1' });
    const req = new Request('https://findlocal.community/api/events', { headers: { 'x-api-key': 'secret' } });
    const r = await requireApiKey(req);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.customerId).toBe('cus_1');
    expect(verifyUnkeyKey).toHaveBeenCalledWith(expect.objectContaining({ key: 'secret', cost: 1 }));
  });

  it('passes through a valid key with its customer id', async () => {
    verifyUnkeyKey.mockResolvedValue({ valid: true, code: 'VALID', keyId: 'key_1', externalId: 'cus_42' });
    const r = await requireApiKey(withKey('good'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.customerId).toBe('cus_42');
      expect(r.keyId).toBe('key_1');
    }
  });

  it('429s on rate limit and on quota, with Retry-After', async () => {
    for (const code of ['RATE_LIMITED', 'USAGE_EXCEEDED']) {
      verifyUnkeyKey.mockResolvedValue({ valid: false, code });
      const r = await requireApiKey(withKey('over'));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.response.status).toBe(429);
        expect(r.response.headers.get('Retry-After')).toBe('60');
      }
    }
  });

  it('503s (fail closed) when Unkey is unreachable', async () => {
    verifyUnkeyKey.mockResolvedValue({ valid: false, code: 'UPSTREAM_ERROR' });
    const r = await requireApiKey(withKey('x'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(503);
  });

  it('401s an unknown or disabled key', async () => {
    verifyUnkeyKey.mockResolvedValue({ valid: false, code: 'NOT_FOUND' });
    const r = await requireApiKey(withKey('nope'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });
});
