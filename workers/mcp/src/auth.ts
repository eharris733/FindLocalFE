// OAuth consent handler (the OAuthProvider `defaultHandler`).
//
// Self-contained — no external identity provider. It renders a small consent page
// where the connecting "business customer" enters their account key (an id that
// exists in USAGE_KV as `customer:<key>`). On approval it completes the OAuth grant
// with { customerId, plan } props, which the MCP agent reads for metering.
//
// This is the "sell to a business customer" flow: they click Connect in Claude.ai,
// authorize as their account, and every tool call is metered against that account.
import { verifyUnkeyKey } from "@findlocal/shared";
import type { CustomerProps, Env } from "./types";

const DEFAULT_ACCOUNT_KEY = "";
const PRICING_URL = "https://findlocal.community/developers/pricing";

function page(body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FindLocal Events — Authorize</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 30rem; margin: 4rem auto; padding: 0 1.25rem; line-height: 1.5; }
  .card { border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 14px; padding: 1.75rem; }
  h1 { font-size: 1.3rem; margin: 0 0 .25rem; }
  p.sub { margin: 0 0 1.25rem; opacity: .7; font-size: .95rem; }
  label { display: block; font-weight: 600; margin: 1rem 0 .35rem; font-size: .9rem; }
  input { width: 100%; padding: .6rem .7rem; border-radius: 9px; font-size: 1rem;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent); background: transparent; color: inherit; }
  button { margin-top: 1.4rem; width: 100%; padding: .7rem; border: 0; border-radius: 9px;
    background: #4f46e5; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; }
  .err { color: #dc2626; font-size: .9rem; margin-top: .75rem; }
  .hint { opacity: .6; font-size: .8rem; margin-top: .5rem; }
</style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function consent(actionQuery: string, clientName: string, accountKey: string, error?: string): Response {
  return page(`
    <h1>Authorize FindLocal Events</h1>
    <p class="sub"><strong>${escapeHtml(clientName)}</strong> is requesting access to the FindLocal Events data API.</p>
    <form method="POST" action="/authorize${actionQuery}">
      <label for="account_key">API key</label>
      <input id="account_key" name="account_key" value="${escapeHtml(accountKey)}" autocomplete="off" placeholder="fl_..." />
      <p class="hint">Don't have a key? Get one at <a href="${PRICING_URL}">findlocal.community/developers/pricing</a>.</p>
      ${error ? `<p class="err">${escapeHtml(error)}</p>` : ""}
      <button type="submit">Connect &amp; authorize</button>
    </form>`, error ? 401 : 200);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export const defaultHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return page(`<h1>FindLocal Events MCP</h1>
        <p class="sub">A metered MCP data API. Add <code>${url.origin}/mcp</code> as a custom connector in Claude, then authorize with an account key.</p>`);
    }

    if (url.pathname !== "/authorize") {
      return new Response("Not found", { status: 404 });
    }

    let authReq;
    try {
      authReq = await env.OAUTH_PROVIDER.parseAuthRequest(request);
    } catch {
      return new Response("Invalid authorization request", { status: 400 });
    }

    const client = await env.OAUTH_PROVIDER.lookupClient(authReq.clientId);
    if (!client) return new Response("Unknown OAuth client", { status: 400 });
    const clientName = client.clientName ?? "An MCP client";

    // GET → render the consent page (keep the OAuth params in the POST action).
    if (request.method === "GET") {
      return consent(url.search, clientName, DEFAULT_ACCOUNT_KEY);
    }

    // POST → validate the API key with Unkey and complete the grant.
    const form = await request.formData();
    const accountKey = String(form.get("account_key") ?? DEFAULT_ACCOUNT_KEY).trim();
    if (!accountKey) {
      return consent(url.search, clientName, accountKey, "Enter your API key to continue.");
    }

    // Validate only (no cost) — metering happens per tool call.
    const v = await verifyUnkeyKey({ rootKey: env.UNKEY_ROOT_KEY, apiBase: env.UNKEY_API_BASE, key: accountKey });
    if (!v.valid) {
      const why =
        v.code === "UPSTREAM_ERROR"
          ? "Authorization is temporarily unavailable — please retry."
          : `That API key is invalid, disabled, or expired. Get one at ${PRICING_URL}.`;
      return consent(url.search, clientName, accountKey, why);
    }

    const props: CustomerProps = {
      customerId: v.externalId ?? v.keyId ?? accountKey,
      plan: String(v.meta?.plan ?? "unknown"),
      key: accountKey,
    };
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: authReq,
      userId: accountKey,
      metadata: { clientName },
      scope: authReq.scope,
      props,
    });
    return Response.redirect(redirectTo, 302);
  },
};
