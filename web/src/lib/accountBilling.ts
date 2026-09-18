// Billing glue between a portal account and Stripe/Unkey. Checkout is initiated
// from the authed dashboard (so we know the user), carrying user.id in metadata;
// the webhook (webhook.ts) calls setAccountPlan to apply the resulting plan.
import type { D1Database } from '@cloudflare/workers-types';
import { setIdentityRatelimits, updateUnkeyKeyLimits } from '@findlocal/shared';
import type { WebEnv } from './db.js';
import { admin, limitsFor } from './billing.js';
import { PLAN_BY_ID, type Plan, type PlanId } from './plans.js';
import { stripePost } from './stripe.js';

const ORIGIN_FALLBACK = 'https://findlocal.community';

function origin(env: WebEnv): string {
  return env.BETTER_AUTH_URL || ORIGIN_FALLBACK;
}

/** Create a Stripe Checkout Session for an upgrade and return its redirect URL.
 * Carries user.id in metadata on both the session and the subscription, so the
 * webhook can link the payment back to the account. */
export async function createCheckoutSession(
  env: WebEnv,
  user: { id: string; email: string; stripeCustomerId?: string },
  planId: PlanId,
): Promise<string> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  const plan = PLAN_BY_ID.get(planId);
  const priceId = plan?.stripePriceEnv ? env[plan.stripePriceEnv] : undefined;
  if (!plan || !priceId) throw new Error(`No Stripe price for plan ${planId}`);

  const form: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[userId]': user.id,
    'subscription_data[metadata][userId]': user.id,
    success_url: `${origin(env)}/developers/dashboard/billing?upgraded=1`,
    cancel_url: `${origin(env)}/developers/dashboard/billing?canceled=1`,
  };
  if (user.stripeCustomerId) form.customer = user.stripeCustomerId;
  else form.customer_email = user.email;

  const session = await stripePost(env.STRIPE_SECRET_KEY, '/v1/checkout/sessions', form);
  const url = session.url as string | undefined;
  if (!url) throw new Error('Stripe did not return a checkout URL');
  return url;
}

/** Apply a plan to an account: cache it on the user row, set the identity's shared
 * ratelimit, and re-limit every active key's monthly credits. Idempotent. */
export async function setAccountPlan(
  env: WebEnv,
  authDb: D1Database,
  opts: { userId: string; stripeCustomerId?: string; plan: Plan },
): Promise<void> {
  const { userId, stripeCustomerId, plan } = opts;

  await authDb
    .prepare('update user set plan = ?, stripeCustomerId = coalesce(?, stripeCustomerId), updatedAt = ? where id = ?')
    .bind(plan.id, stripeCustomerId ?? null, new Date().toISOString(), userId)
    .run();

  if (env.UNKEY_ROOT_KEY && env.UNKEY_API_ID) {
    await setIdentityRatelimits(admin(env), {
      externalId: userId,
      perMinuteLimit: plan.perMinuteLimit,
      plan: plan.id,
    });
    const keys = await authDb
      .prepare('select unkey_key_id from api_key where user_id = ? and revoked_at is null')
      .bind(userId)
      .all<{ unkey_key_id: string }>();
    for (const k of keys.results) {
      await updateUnkeyKeyLimits(admin(env), k.unkey_key_id, limitsFor(plan));
    }
  }
}

/** Resolve the account id for a Stripe event: prefer explicit metadata.userId,
 * else look the user up by the Stripe customer id. */
export async function resolveUserId(
  authDb: D1Database,
  opts: { metadataUserId?: string; stripeCustomerId?: string },
): Promise<string | null> {
  if (opts.metadataUserId) return opts.metadataUserId;
  if (!opts.stripeCustomerId) return null;
  const row = await authDb
    .prepare('select id from user where stripeCustomerId = ?')
    .bind(opts.stripeCustomerId)
    .first<{ id: string }>();
  return row?.id ?? null;
}
