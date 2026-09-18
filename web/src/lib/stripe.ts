// Minimal Stripe helpers for the billing webhook — no SDK (the Node Stripe SDK
// pulls in APIs Workers lack). We only need two things: verify the webhook
// signature, and PATCH a subscription's metadata to remember the Unkey key id.

const STRIPE_API = 'https://api.stripe.com';

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time-ish string compare (avoids early-exit timing leaks). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Stripe webhook signature (scheme v1: HMAC-SHA256 over `t.payload`).
 * `payload` MUST be the raw request body string, byte-for-byte. Returns true when
 * a v1 signature matches and the timestamp is within `toleranceSec`.
 */
export async function verifyStripeSignature(
  payload: string,
  sigHeader: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`));
  return safeEqual(toHex(mac), v1);
}

/** GET a Stripe resource: optionally expand fields and/or filter with query params
 * (e.g. list customers by `email`, or subscriptions by `customer` + `status`). */
export async function stripeGet(
  secretKey: string,
  path: string,
  expand: string[] = [],
  query: Record<string, string> = {},
): Promise<Record<string, any>> {
  const params = new URLSearchParams();
  expand.forEach((e, i) => params.set(`expand[${i}]`, e));
  for (const [k, v] of Object.entries(query)) params.set(k, v);
  const qs = params.toString();
  const res = await fetch(`${STRIPE_API}${path}${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`Stripe GET ${path} failed (${res.status}): ${JSON.stringify(body.error ?? body)}`);
  return body;
}

/** PATCH a Stripe resource with form-encoded fields (e.g. subscription metadata). */
export async function stripePost(
  secretKey: string,
  path: string,
  form: Record<string, string>,
): Promise<Record<string, any>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`Stripe ${path} failed (${res.status}): ${JSON.stringify(body.error ?? body)}`);
  return body;
}
