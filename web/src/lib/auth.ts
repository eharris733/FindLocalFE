// Better Auth instance for the developer portal, wired to the writable AUTH_DB
// (Kysely + D1) with AUTH_KV as secondary storage for fast edge session reads.
// This is a per-isolate factory memoized on the env object: Better Auth is a bit
// heavy to build, and the `env` proxy from cloudflare:workers is stable, so we
// cache one instance per env rather than rebuilding on every request.
//
// Phase A: email+password, magic link, email verify/reset. Social providers
// (Google/GitHub) light up automatically once their id+secret env are present
// (Phase B). TOTP + passkeys (Phase C) are added later with their own migrations.
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { WebEnv } from './db.js';
import { sendMagicLinkEmail, sendResetPasswordEmail, sendVerificationEmail } from './authEmail.js';

export type Auth = ReturnType<typeof buildAuth>;

const cache = new WeakMap<WebEnv, Auth>();

/** Build (or reuse) the Better Auth instance for this env. */
export function getAuth(env: WebEnv): Auth {
  const hit = cache.get(env);
  if (hit) return hit;
  const auth = buildAuth(env);
  cache.set(env, auth);
  return auth;
}

function buildAuth(env: WebEnv) {
  if (!env.AUTH_DB) throw new Error('AUTH_DB binding is not configured');
  const db = new Kysely({ dialect: new D1Dialect({ database: env.AUTH_DB }) });

  // KV-backed secondary storage. cookieCache is intentionally NOT enabled
  // (Better Auth issue #4203: cookieCache + secondaryStorage mis-handles refresh).
  const kv = env.AUTH_KV;
  const secondaryStorage = kv
    ? {
        get: (key: string) => kv.get(key),
        set: async (key: string, value: string, ttl?: number) => {
          await kv.put(key, value, ttl ? { expirationTtl: ttl } : {});
        },
        delete: async (key: string) => {
          await kv.delete(key);
        },
        getAndDelete: async (key: string) => {
          const value = await kv.get(key);
          if (value !== null) await kv.delete(key);
          return value;
        },
        // KV has no atomic increment; this best-effort read-modify-write is enough
        // for Better Auth's secondary-storage rate limiting (Turnstile is the
        // stronger, deferred control). TTL is applied only on first write so the
        // window expires a fixed time after it opened.
        increment: async (key: string, ttl: number) => {
          const current = Number((await kv.get(key)) ?? '0');
          const next = current + 1;
          await kv.put(key, String(next), current === 0 && ttl ? { expirationTtl: ttl } : {});
          return next;
        },
      }
    : undefined;

  const social: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    social.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    social.github = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }

  return betterAuth({
    // Kysely dialect over D1; type must be declared for the sqlite generator.
    database: { db, type: 'sqlite' },
    // D1 blocks the PRAGMA / sqlite_master introspection Better Auth uses to
    // validate the live schema (SQLITE_AUTH). We own the migrations in
    // web/migrations, so turn the runtime check off.
    advanced: { database: { validateSchema: false } },
    secret: env.BETTER_AUTH_SECRET,
    // Empty → let Better Auth infer the origin from the request. In production set
    // BETTER_AUTH_URL to https://findlocal.community; for local http dev, override
    // it to http://localhost:4321 in web/.dev.vars so cookies aren't `secure`.
    baseURL: env.BETTER_AUTH_URL || undefined,
    secondaryStorage,
    trustedOrigins: trustedOrigins(env),
    emailAndPassword: {
      enabled: true,
      // Phase A: don't hard-block sign-in on verification (email is best-effort in
      // local dev). Flip to true once deliverability is confirmed in production.
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail(env.EMAIL, { to: user.email, url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(env.EMAIL, { to: user.email, url });
      },
    },
    socialProviders: social,
    // Billing + Unkey linkage cached on the account for fast dashboard render and
    // authorization. `plan` is server-managed (input:false) — only the Stripe
    // webhook / key flow may change it.
    user: {
      additionalFields: {
        stripeCustomerId: { type: 'string', required: false, input: false },
        plan: { type: 'string', required: false, defaultValue: 'free', input: false },
        unkeyIdentityId: { type: 'string', required: false, input: false },
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(env.EMAIL, { to: email, url });
        },
      }),
    ],
  });
}

function trustedOrigins(env: WebEnv): string[] {
  const origins = ['http://localhost:4321'];
  if (env.BETTER_AUTH_URL) origins.push(env.BETTER_AUTH_URL);
  return origins;
}

/** The authenticated user for a request, or null. Pages use this to gate. */
export async function getSessionUser(
  env: WebEnv,
  headers: Headers,
): Promise<{ id: string; email: string; name?: string; plan?: string; stripeCustomerId?: string } | null> {
  const res = await getAuth(env).api.getSession({ headers });
  if (!res?.user) return null;
  const u = res.user as Record<string, unknown>;
  return {
    id: String(u.id),
    email: String(u.email),
    name: typeof u.name === 'string' ? u.name : undefined,
    plan: typeof u.plan === 'string' ? u.plan : 'free',
    stripeCustomerId: typeof u.stripeCustomerId === 'string' ? u.stripeCustomerId : undefined,
  };
}
