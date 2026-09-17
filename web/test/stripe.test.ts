import { describe, expect, it } from 'vitest';
import { verifyStripeSignature } from '../src/lib/stripe.js';

const SECRET = 'whsec_test_secret';

async function sign(payload: string, t: number, secret = SECRET): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${t},v1=${hex}`;
}

describe('verifyStripeSignature', () => {
  const body = JSON.stringify({ type: 'checkout.session.completed', id: 'evt_1' });
  const now = 1_700_000_000;

  it('accepts a correctly-signed, in-window payload', async () => {
    const header = await sign(body, now);
    expect(await verifyStripeSignature(body, header, SECRET, 300, now)).toBe(true);
  });

  it('rejects a tampered body', async () => {
    const header = await sign(body, now);
    expect(await verifyStripeSignature(body + ' ', header, SECRET, 300, now)).toBe(false);
  });

  it('rejects a signature made with the wrong secret', async () => {
    const header = await sign(body, now, 'whsec_wrong');
    expect(await verifyStripeSignature(body, header, SECRET, 300, now)).toBe(false);
  });

  it('rejects a timestamp outside the tolerance (replay)', async () => {
    const header = await sign(body, now - 10_000);
    expect(await verifyStripeSignature(body, header, SECRET, 300, now)).toBe(false);
  });

  it('rejects missing header or secret', async () => {
    expect(await verifyStripeSignature(body, null, SECRET, 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, await sign(body, now), '', 300, now)).toBe(false);
  });
});
