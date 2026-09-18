// Astro on Cloudflare: bindings come from the cloudflare:workers module, not
// Astro.locals.runtime.env. Query helpers live in @findlocal/shared so the MCP
// worker, the JSON API and this site share identical query semantics — this
// file re-exports them so pages have one import and ZERO SQL of their own.
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';

/** The Worker's bindings + vars/secrets. This file is the ONLY importer of
 * `cloudflare:workers`, so every consumer reads the environment through here. */
/** The Cloudflare Email Service `send_email` binding (see wrangler send_email). */
export interface EmailBinding {
  send(message: {
    to: string;
    from: { email: string; name?: string };
    subject: string;
    html: string;
    text: string;
  }): Promise<unknown>;
}

export interface WebEnv {
  DB: D1Database;
  /** The developer-portal / Better Auth database. WRITABLE and owned by this repo
   * (accounts, sessions, OAuth links, passkeys, TOTP, our api_key table). The
   * read-only discipline applies only to `DB`. Absent in some local dev runs
   * until `wrangler d1 create findlocal-auth` + migrations have been applied. */
  AUTH_DB?: D1Database;
  /** Better Auth secondary storage (fast edge session reads). */
  AUTH_KV?: KVNamespace;
  /** Better Auth signing secret + base URL (origin). */
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  /** Social OAuth (Phase B). Client ids are vars; secrets are `wrangler secret`. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  /** Unkey root key (secret) — verifies developer API keys. Absent in local dev. */
  UNKEY_ROOT_KEY?: string;
  /** Unkey API id (var) — used when minting keys from the billing webhook. */
  UNKEY_API_ID?: string;
  /** Optional base-URL override for Unkey (defaults to https://api.unkey.com). */
  UNKEY_API_BASE?: string;

  // --- Billing (Stripe) + key delivery (Cloudflare Email Service). Phase 3. ---
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_SCALE?: string;
  /** Stripe customer-portal URL (manage/cancel) shown on the pricing page. */
  STRIPE_PORTAL_URL?: string;
  /** Stripe Payment Link per plan (pricing-page CTAs). */
  STRIPE_PAYMENT_LINK_FREE?: string;
  STRIPE_PAYMENT_LINK_PRO?: string;
  STRIPE_PAYMENT_LINK_SCALE?: string;
  EMAIL?: EmailBinding;
}

export function getEnv(): WebEnv {
  return env as unknown as WebEnv;
}

export function getDb(): D1Database {
  return getEnv().DB;
}

/** The writable developer-portal database. Throws if the binding is missing so a
 * misconfigured deploy fails loudly rather than silently losing account writes. */
export function getAuthDb(): D1Database {
  const db = getEnv().AUTH_DB;
  if (!db) throw new Error('AUTH_DB binding is not configured');
  return db;
}

export {
  attachAuthors,
  attachBooks,
  authorsByIds,
  booksByIds,
  booksByAuthorIds,
  latestBooksByAuthors,
  categoryCounts,
  countUpcomingEvents,
  countUpcomingEventsByCity,
  countUpcomingEventsForCities,
  getEvent,
  getEventsByIds,
  getVenue,
  listEventsInBounds,
  listRegions,
  listSeriesDates,
  listSitemapEvents,
  listSitemapVenues,
  listUpcomingEvents,
  listUpcomingEventsForCities,
  listUpcomingEventsForVenue,
  listVenues,
  listVenueTypes,
  countUpcomingEventsForVenue,
  type AuthorRow,
  type BookRow,
  type EventFilters,
  type EventRow,
  type MapEventOptions,
  type MapEventRow,
  type VenueRow,
} from '@findlocal/shared';
