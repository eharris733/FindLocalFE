import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerProps, Env } from "../src/types";

const { verifyUnkeyKey } = vi.hoisted(() => ({ verifyUnkeyKey: vi.fn() }));
vi.mock("@findlocal/shared", () => ({ verifyUnkeyKey }));

import { enforceAndMeter, readUsage } from "../src/metering";

const env = { UNKEY_ROOT_KEY: "root" } as unknown as Env;
const props = { customerId: "cus_1", plan: "pro", key: "fl_secret" } as CustomerProps;

describe("enforceAndMeter", () => {
  beforeEach(() => verifyUnkeyKey.mockReset());

  it("skips metering in authless dev mode (no props)", async () => {
    expect(await enforceAndMeter(env, undefined)).toEqual({ ok: true });
    expect(verifyUnkeyKey).not.toHaveBeenCalled();
  });

  it("meters a valid key with cost 1", async () => {
    verifyUnkeyKey.mockResolvedValue({ valid: true, code: "VALID" });
    expect(await enforceAndMeter(env, props)).toEqual({ ok: true });
    expect(verifyUnkeyKey).toHaveBeenCalledWith(expect.objectContaining({ key: "fl_secret", cost: 1 }));
  });

  it("blocks on quota, rate limit, invalid, and (fail-closed) upstream errors", async () => {
    for (const code of ["USAGE_EXCEEDED", "RATE_LIMITED", "NOT_FOUND", "UPSTREAM_ERROR"]) {
      verifyUnkeyKey.mockResolvedValue({ valid: false, code });
      const r = await enforceAndMeter(env, props);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toBeTruthy();
    }
  });
});

describe("readUsage", () => {
  beforeEach(() => verifyUnkeyKey.mockReset());

  it("reports remaining without spending a credit (no cost)", async () => {
    verifyUnkeyKey.mockResolvedValue({ valid: true, code: "VALID", remaining: 4200 });
    const u = await readUsage(env, props);
    expect(u).toMatchObject({ metered: true, customer_id: "cus_1", plan: "pro", remaining: 4200 });
    expect(verifyUnkeyKey).toHaveBeenCalledWith(expect.not.objectContaining({ cost: expect.anything() }));
  });

  it("returns unmetered when there is no key", async () => {
    expect(await readUsage(env, undefined)).toEqual({ metered: false });
  });
});
