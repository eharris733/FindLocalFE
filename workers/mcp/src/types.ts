import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

/** Worker environment bindings (see wrangler.toml — authoritative). */
export interface Env {
  /** Same D1 as the FindLocalData pipeline. READ-ONLY BY DISCIPLINE: this worker
   * only ever calls the SELECT helpers in @findlocal/shared (queries.ts). */
  DB: D1Database;

  // OAuth provider (src/index.ts)
  COOKIE_ENCRYPTION_KEY: string;
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers; // injected by @cloudflare/workers-oauth-provider

  // Metering + authorization (Unkey). The root key verifies the account key the
  // customer enters at consent and meters every tool call (cost: 1).
  UNKEY_ROOT_KEY: string;
  UNKEY_API_ID?: string;
  UNKEY_API_BASE?: string;

  // Legacy metering store — retired now that Unkey is the source of truth.
  // Kept as a binding only so an in-flight deploy doesn't break; safe to remove.
  USAGE_KV?: KVNamespace;

  // Durable Object backing McpAgent
  MCP_OBJECT: DurableObjectNamespace;
}

/**
 * OAuth grant props — populated by the consent handler (src/auth.ts) and read as
 * `this.props` inside the MCP agent. This is how a tool call knows which paying
 * customer it belongs to, for metering.
 */
export interface CustomerProps {
  customerId: string;
  plan: string;
  /** The Unkey API key the customer authorized with. Stored in the (encrypted)
   * OAuth grant so each tool call can re-verify + meter it against Unkey. */
  key: string;
  [key: string]: unknown; // OAuthProvider requires Record<string, unknown>
}
