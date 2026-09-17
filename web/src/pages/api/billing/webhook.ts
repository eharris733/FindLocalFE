import type { APIRoute } from 'astro';
import {
  createUnkeyKey,
  updateUnkeyKeyLimits,
  revokeUnkeyKey,
  type KeyLimits,
  type UnkeyAdmin,
} from '@findlocal/shared';
import { getEnv } from '../../../lib/db.js';
import { PLAN_BY_ID, planForStripePrice, type Plan } from '../../../lib/plans.js';
import { verifyStripeSignature, stripeGet, stripePost } from '../../../lib/stripe.js';
import { sendApiKeyEmail } from '../../../lib/billingEmail.js';

export const prerender = false;

// Stripe -> Unkey provisioning. Configure the endpoint in Stripe on the events:
//   checkout.session.completed, customer.subscription.updated/deleted
// The webhook is NOT key-gated (apiScope classifies it 'open'); it authenticates
// itself with the Stripe signature. Bodies are read RAW for signature checking.

function admin(env: ReturnType<typeof getEnv>): UnkeyAdmin {
  return { rootKey: env.UNKEY_ROOT_KEY!, apiId: env.UNKEY_API_ID!, apiBase: env.UNKEY_API_BASE };
}

function limitsFor(plan: Plan): KeyLimits {
  return { monthlyQuota: plan.monthlyQuota, perMinuteLimit: plan.perMinuteLimit, plan: plan.id };
}

/** Resolve the plan from the Payment Link metadata, falling back to the
 * subscription's price id (robust to how Stripe propagates link metadata). */
async function planFromSession(session: any, env: ReturnType<typeof getEnv>): Promise<Plan | undefined> {
  const byMeta = PLAN_BY_ID.get(session.metadata?.plan);
  if (byMeta) return byMeta;
  if (!session.subscription || !env.STRIPE_SECRET_KEY) return undefined;
  const sub = await stripeGet(env.STRIPE_SECRET_KEY, `/v1/subscriptions/${session.subscription}`);
  const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
  return planForStripePrice(priceId, env as unknown as Record<string, string | undefined>);
}

/** First subscription for a customer: mint a key, remember its id, email it. */
async function provision(session: any, env: ReturnType<typeof getEnv>): Promise<void> {
  const plan = await planFromSession(session, env);
  const email = session.customer_details?.email as string | undefined;
  if (!plan || !session.customer) return;

  const { keyId, key } = await createUnkeyKey(admin(env), {
    externalId: String(session.customer),
    name: `${plan.id}:${email ?? session.customer}`,
    limits: limitsFor(plan),
  });

  if (session.subscription && env.STRIPE_SECRET_KEY) {
    await stripePost(env.STRIPE_SECRET_KEY, `/v1/subscriptions/${session.subscription}`, {
      'metadata[unkey_key_id]': keyId,
      'metadata[plan]': plan.id,
    });
  }
  if (email) await sendApiKeyEmail(env.EMAIL, { to: email, plan: plan.name, key });
}

/** Portal upgrade/downgrade: move the existing key to the new plan's limits. */
async function reprice(sub: any, env: ReturnType<typeof getEnv>): Promise<void> {
  const keyId = sub.metadata?.unkey_key_id as string | undefined;
  if (!keyId) return;
  const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
  const plan = planForStripePrice(priceId, env as unknown as Record<string, string | undefined>)
    ?? PLAN_BY_ID.get(sub.metadata?.plan);
  if (plan) await updateUnkeyKeyLimits(admin(env), keyId, limitsFor(plan));
}

async function cancel(sub: any, env: ReturnType<typeof getEnv>): Promise<void> {
  const keyId = sub.metadata?.unkey_key_id as string | undefined;
  if (keyId) await revokeUnkeyKey(admin(env), keyId);
}

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET || !env.UNKEY_ROOT_KEY || !env.UNKEY_API_ID) {
    return new Response('billing not configured', { status: 503 });
  }

  const raw = await request.text();
  const ok = await verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response('invalid signature', { status: 400 });

  const event = JSON.parse(raw) as { type: string; data: { object: any } };
  try {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') await provision(obj, env);
    else if (event.type === 'customer.subscription.updated') await reprice(obj, env);
    else if (event.type === 'customer.subscription.deleted') await cancel(obj, env);
  } catch (e) {
    // Log and 500 so Stripe retries transient provisioning failures.
    console.error('billing webhook error', event.type, (e as Error).message);
    return new Response('provisioning error', { status: 500 });
  }
  return new Response('ok', { status: 200 });
};
