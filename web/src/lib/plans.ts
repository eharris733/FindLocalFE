// The plan catalogue — single source of truth for the pricing page AND the Stripe
// webhook's plan -> Unkey-limits mapping. Prices are display-only; the real amount
// lives in the Stripe Price. Stripe price ids come from env (they differ between
// test and live mode), so this file holds only the display + enforcement facts.
//
// PLACEHOLDERS: tune `monthlyQuota` / `perMinuteLimit` / `priceUsd` to taste, and
// set the matching STRIPE_PRICE_* env vars once the Stripe Prices exist.

export type PlanId = 'free' | 'pro' | 'scale';

export interface Plan {
  id: PlanId;
  name: string;
  /** Display price in USD/month (0 = free). */
  priceUsd: number;
  /** Monthly included calls — Unkey `credits.remaining` with monthly refill. */
  monthlyQuota: number;
  /** Burst ceiling — Unkey ratelimit, requests per minute. */
  perMinuteLimit: number;
  /** Env var holding this plan's Stripe Price id (undefined for free). */
  stripePriceEnv?: 'STRIPE_PRICE_PRO' | 'STRIPE_PRICE_SCALE';
  blurb: string;
}

export const PLANS: Plan[] = [
  { id: 'free', name: 'Free', priceUsd: 0, monthlyQuota: 1_000, perMinuteLimit: 30,
    blurb: 'For trying the API and small projects.' },
  { id: 'pro', name: 'Pro', priceUsd: 49, monthlyQuota: 50_000, perMinuteLimit: 120,
    stripePriceEnv: 'STRIPE_PRICE_PRO', blurb: 'For production apps and agents.' },
  { id: 'scale', name: 'Scale', priceUsd: 249, monthlyQuota: 500_000, perMinuteLimit: 600,
    stripePriceEnv: 'STRIPE_PRICE_SCALE', blurb: 'For high-volume and commercial use.' },
];

export const PLAN_BY_ID = new Map(PLANS.map((p) => [p.id, p]));

/** Map a Stripe Price id (from a webhook event) back to a plan, using env. */
export function planForStripePrice(
  priceId: string | undefined,
  env: Record<string, string | undefined>,
): Plan | undefined {
  if (!priceId) return undefined;
  return PLANS.find((p) => p.stripePriceEnv && env[p.stripePriceEnv] === priceId);
}
