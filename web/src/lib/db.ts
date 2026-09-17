// Astro on Cloudflare: bindings come from the cloudflare:workers module, not
// Astro.locals.runtime.env. Query helpers live in @findlocal/shared so the MCP
// worker, the JSON API and this site share identical query semantics — this
// file re-exports them so pages have one import and ZERO SQL of their own.
import type { D1Database } from '@cloudflare/workers-types';
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
