import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { getEnv, getAuthDb } from '../../../lib/db.js';
import { setAccountPlan, resolveUserId } from '../../../lib/accountBilling.js';
import { PLAN_BY_ID, planForStripePrice, type Plan } from '../../../lib/plans.js';
import { verifyStripeSignature, stripeGet } from '../../../lib/stripe.js';

export const prerender = false;

// Stripe -> account plan. Configure the endpoint in Stripe on the events:
//   checkout.session.completed, customer.subscription.updated/deleted
// The webhook is NOT key-gated (apiScope classifies it 'open'); it authenticates
// itself with the Stripe signature. Bodies are read RAW for signature checking.
//
// Accounts-first model: Checkout is started from the authed dashboard with
// metadata.userId, so every event resolves to a portal account. Applying a plan
// caches it on the user row, sets the account's Unkey identity ratelimit, and
// re-limits the account's keys — see accountBilling.setAccountPlan. Keys are minted
// by the user in the dashboard, not here.

const FREE = PLAN_BY_ID.get('free')!;

/** Resolve the plan from the Payment Link/session metadata, else the subscription's
 * price id. */
async function planFromSession(session: any, env: ReturnType<typeof getEnv>): Promise<Plan | undefined> {
  const byMeta = PLAN_BY_ID.get(session.metadata?.plan);
  if (byMeta) return byMeta;
  if (!session.subscription || !env.STRIPE_SECRET_KEY) return undefined;
  const sub = await stripeGet(env.STRIPE_SECRET_KEY, `/v1/subscriptions/${session.subscription}`);
  const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
  return planForStripePrice(priceId, env as unknown as Record<string, string | undefined>);
}

function planFromSubscription(sub: any, env: ReturnType<typeof getEnv>): Plan | undefined {
  const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
  return (
    planForStripePrice(priceId, env as unknown as Record<string, string | undefined>) ??
    PLAN_BY_ID.get(sub.metadata?.plan)
  );
}

async function provision(session: any, env: ReturnType<typeof getEnv>, authDb: D1Database): Promise<void> {
  const plan = await planFromSession(session, env);
  const userId = await resolveUserId(authDb, {
    metadataUserId: session.metadata?.userId,
    stripeCustomerId: session.customer ? String(session.customer) : undefined,
  });
  if (!plan || !userId) return;
  await setAccountPlan(env, authDb, {
    userId,
    stripeCustomerId: session.customer ? String(session.customer) : undefined,
    plan,
  });
}

async function reprice(sub: any, env: ReturnType<typeof getEnv>, authDb: D1Database): Promise<void> {
  const userId = await resolveUserId(authDb, {
    metadataUserId: sub.metadata?.userId,
    stripeCustomerId: sub.customer ? String(sub.customer) : undefined,
  });
  const plan = planFromSubscription(sub, env);
  if (!userId || !plan) return;
  await setAccountPlan(env, authDb, { userId, stripeCustomerId: String(sub.customer), plan });
}

async function cancel(sub: any, env: ReturnType<typeof getEnv>, authDb: D1Database): Promise<void> {
  const userId = await resolveUserId(authDb, {
    metadataUserId: sub.metadata?.userId,
    stripeCustomerId: sub.customer ? String(sub.customer) : undefined,
  });
  if (!userId) return;
  // Downgrade to free — keys keep working at the free tier, not revoked.
  await setAccountPlan(env, authDb, { userId, stripeCustomerId: String(sub.customer), plan: FREE });
}

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET || !env.UNKEY_ROOT_KEY || !env.UNKEY_API_ID || !env.AUTH_DB) {
    return new Response('billing not configured', { status: 503 });
  }

  const raw = await request.text();
  const ok = await verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response('invalid signature', { status: 400 });

  const event = JSON.parse(raw) as { type: string; data: { object: any } };
  const authDb = getAuthDb();
  try {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') await provision(obj, env, authDb);
    else if (event.type === 'customer.subscription.updated') await reprice(obj, env, authDb);
    else if (event.type === 'customer.subscription.deleted') await cancel(obj, env, authDb);
  } catch (e) {
    // Log and 500 so Stripe retries transient provisioning failures.
    console.error('billing webhook error', event.type, (e as Error).message);
    return new Response('provisioning error', { status: 500 });
  }
  return new Response('ok', { status: 200 });
};
