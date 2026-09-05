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

  // Metering
  USAGE_KV: KVNamespace;

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
  [key: string]: unknown; // OAuthProvider requires Record<string, unknown>
}

/** A customer record stored in USAGE_KV under `customer:<id>`. */
export interface CustomerRecord {
  plan: string;
  monthly_quota: number;
  active: boolean;
}
