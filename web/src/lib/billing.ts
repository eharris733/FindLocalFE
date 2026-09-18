// Shared Unkey-admin plumbing for the billing webhook AND the self-serve manage
// page, so the two can never drift on how a key's limits map to a plan.
import type { KeyLimits, UnkeyAdmin } from '@findlocal/shared';
import type { WebEnv } from './db.js';
import type { Plan } from './plans.js';

/** The Unkey admin credentials from the environment (root key + api id). */
export function admin(env: WebEnv): UnkeyAdmin {
  return { rootKey: env.UNKEY_ROOT_KEY!, apiId: env.UNKEY_API_ID!, apiBase: env.UNKEY_API_BASE };
}

/** A plan's enforcement facts in Unkey's limits shape. */
export function limitsFor(plan: Plan): KeyLimits {
  return { monthlyQuota: plan.monthlyQuota, perMinuteLimit: plan.perMinuteLimit, plan: plan.id };
}
