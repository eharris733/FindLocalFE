// OAuth consent handler (the OAuthProvider `defaultHandler`).
//
// Self-contained — no external identity provider. It renders a small consent page
// where the connecting "business customer" enters their account key (an id that
// exists in USAGE_KV as `customer:<key>`). On approval it completes the OAuth grant
// with { customerId, plan } props, which the MCP agent reads for metering.
//
// This is the "sell to a business customer" flow: they click Connect in Claude.ai,
// authorize as their account, and every tool call is metered against that account.
import type { CustomerProps, CustomerRecord, Env } from "./types";

const DEFAULT_ACCOUNT_KEY = "demo-pro";

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
      <label for="account_key">Account key</label>
      <input id="account_key" name="account_key" value="${escapeHtml(accountKey)}" autocomplete="off" />
      <p class="hint">Demo accounts: <code>demo-pro</code> (10k/mo), <code>demo-free</code> (100/mo).</p>
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

    // POST → validate the account key and complete the grant.
    const form = await request.formData();
    const accountKey = String(form.get("account_key") ?? DEFAULT_ACCOUNT_KEY).trim();

    const rec = (await env.USAGE_KV.get(`customer:${accountKey}`, "json")) as CustomerRecord | null;
    if (!rec || !rec.active) {
      return consent(url.search, clientName, accountKey, `Account '${accountKey}' was not found or is inactive.`);
    }

    const props: CustomerProps = { customerId: accountKey, plan: rec.plan };
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
