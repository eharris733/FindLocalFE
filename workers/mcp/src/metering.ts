// Per-customer usage metering in USAGE_KV — the "sellable, billable API" layer.
//
// customer:<id>            → { plan, monthly_quota, active }
// usage:<id>:<YYYY-MM>     → integer call count (incremented per tool call)
//
// The counter is the demo money-shot: `wrangler kv key get "usage:<id>:<month>"`
// before/after tool calls shows a metered API you can bill against.
import type { CustomerRecord, Env } from "./types";

export type MeterResult = { ok: true } | { ok: false; message: string };

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Validate the customer, enforce their monthly quota, and increment usage.
 * When `customerId` is undefined (authless dev mode) metering is skipped.
 */
export async function enforceAndMeter(env: Env, customerId: string | undefined): Promise<MeterResult> {
  if (!customerId) return { ok: true }; // authless / anonymous — no metering

  const rec = (await env.USAGE_KV.get(`customer:${customerId}`, "json")) as CustomerRecord | null;
  if (!rec || !rec.active) {
    return { ok: false, message: `Account '${customerId}' was not found or is inactive.` };
  }

  const key = `usage:${customerId}:${currentMonth()}`;
  const used = Number.parseInt((await env.USAGE_KV.get(key)) ?? "0", 10) || 0;

  if (rec.monthly_quota && used >= rec.monthly_quota) {
    return {
      ok: false,
      message: `Monthly quota reached for '${customerId}' (${used}/${rec.monthly_quota} on the '${rec.plan}' plan). Upgrade to continue.`,
    };
  }

  // Best-effort increment (KV is eventually consistent; fine for a metering demo).
  await env.USAGE_KV.put(key, String(used + 1));
  return { ok: true };
}

/** Read the current month's usage for a customer (used by the get_usage tool). */
export async function readUsage(env: Env, customerId: string | undefined) {
  if (!customerId) return { metered: false as const };
  const rec = (await env.USAGE_KV.get(`customer:${customerId}`, "json")) as CustomerRecord | null;
  const used = Number.parseInt((await env.USAGE_KV.get(`usage:${customerId}:${currentMonth()}`)) ?? "0", 10) || 0;
  return {
    metered: true as const,
    customer_id: customerId,
    plan: rec?.plan ?? "unknown",
    month: currentMonth(),
    used,
    monthly_quota: rec?.monthly_quota ?? null,
    remaining: rec?.monthly_quota ? Math.max(0, rec.monthly_quota - used) : null,
  };
}
