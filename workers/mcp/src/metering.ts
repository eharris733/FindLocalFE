// Per-customer authorization + metering, backed by Unkey (the same key system the
// REST API uses). Every metered tool call re-verifies the customer's key with
// `cost: 1`, so Unkey atomically enforces the plan's rate limit / monthly quota and
// decrements remaining credits — replacing the old non-atomic USAGE_KV counter.
import { verifyUnkeyKey } from "@findlocal/shared";
import type { CustomerProps, Env } from "./types";

export type MeterResult = { ok: true } | { ok: false; message: string };

function unkeyBase(env: Env) {
  return { rootKey: env.UNKEY_ROOT_KEY, apiBase: env.UNKEY_API_BASE };
}

/**
 * Verify the customer's key and meter one call. When `props` is absent (authless
 * dev mode) metering is skipped. Fails closed on an Unkey outage.
 */
export async function enforceAndMeter(env: Env, props: CustomerProps | undefined): Promise<MeterResult> {
  if (!props?.key) return { ok: true }; // authless / anonymous — no metering

  const v = await verifyUnkeyKey({ ...unkeyBase(env), key: props.key, cost: 1 });
  if (v.valid) return { ok: true };

  if (v.code === "UPSTREAM_ERROR") return { ok: false, message: "Metering is temporarily unavailable — please retry." };
  if (v.code === "RATE_LIMITED") return { ok: false, message: "Rate limit exceeded — slow down and retry shortly." };
  if (v.code === "USAGE_EXCEEDED") {
    return { ok: false, message: `Monthly quota reached on the '${props.plan}' plan. Upgrade at https://findlocal.community/developers/pricing to continue.` };
  }
  return { ok: false, message: "Your API key is invalid, expired, or disabled." };
}

/** Read the customer's remaining quota (backs the get_usage tool). Verifies with
 * no cost so it doesn't consume a credit. */
export async function readUsage(env: Env, props: CustomerProps | undefined) {
  if (!props?.key) return { metered: false as const };
  const v = await verifyUnkeyKey({ ...unkeyBase(env), key: props.key });
  return {
    metered: true as const,
    customer_id: props.customerId,
    plan: props.plan,
    remaining: v.remaining ?? null,
    key_valid: v.valid,
  };
}
