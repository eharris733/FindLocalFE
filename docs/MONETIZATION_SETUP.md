# Monetizing the API + MCP — setup & go-live runbook

The code (Unkey key-gating on the REST API, MCP unified onto Unkey, Stripe
webhook + pricing page + key email) is in place. This runbook is the external
setup you do once, plus the **deploy ordering** that keeps the API from breaking.

> ⚠️ The gate **fails closed**. If the code deploys before `UNKEY_ROOT_KEY` is set
> in production, `/api/events`, `/api/events/<id>`, `/api/venues` and every MCP
> tool return 503. **Set the secrets first, then deploy.**

## 1. Unkey (keys + rate limits + metering)

1. Create a workspace and an **API** (note its `api_...` id).
2. Create a **root key** with permissions to create/verify/update keys.
3. Plans map to key limits in `web/src/lib/plans.ts` (Free 1k/mo, Pro 50k/mo,
   Scale 500k/mo; per-minute burst 30/120/600). The webhook mints keys with
   `credits.remaining` + monthly refill and a `requests`/60s ratelimit.
4. Set the secret + var on **both** workers:
   ```bash
   wrangler secret put UNKEY_ROOT_KEY                                  # web
   wrangler secret put UNKEY_ROOT_KEY --config workers/mcp/wrangler.toml
   ```
   Put the `api_...` id in `UNKEY_API_ID` (in each `wrangler.toml [vars]`).

## 2. Stripe (payment)

1. Products/Prices: **Pro** ($49/mo) and **Scale** ($249/mo) recurring; a **Free**
   product at $0/mo (Stripe still collects the email, no card). Put the Pro/Scale
   Price ids in `STRIPE_PRICE_PRO` / `STRIPE_PRICE_SCALE` (web `[vars]`).
2. **Payment Links** — one per plan. On each link set **metadata `plan` =
   `free` | `pro` | `scale`** (the webhook reads `session.metadata.plan`). Put the
   link URLs in `STRIPE_PAYMENT_LINK_FREE/PRO/SCALE`.
3. **Customer portal**: enable it, allow plan changes + cancel; put its URL in
   `STRIPE_PORTAL_URL`.
4. **Webhook endpoint**: `https://findlocal.community/api/billing/webhook`,
   subscribe to `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the signing secret:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET   # web
   wrangler secret put STRIPE_SECRET_KEY       # web (writes key id back to the sub)
   ```

## 3. Cloudflare Email Service (delivers the key)

Onboard the sending domain once (adds DKIM/SPF), then the `EMAIL` binding works:
```bash
npx wrangler email sending enable findlocal.community
```
Email is sent from `developers@findlocal.community` (see `web/src/lib/billingEmail.ts`).

## 4. Deploy order (once secrets are set)

```bash
npm run typecheck && npm test        # green
npm run deploy:mcp                   # MCP first (has UNKEY_ROOT_KEY)
npm run deploy:web                   # then web (gate + webhook + pricing + docs)
```
The docs rewrite ships **with** the web deploy, so the site never advertises keys
the backend isn't enforcing yet.

## 5. Verify end-to-end

```bash
# REST: gate works
curl -si https://findlocal.community/api/events?city=boston | head -1      # 401
curl -si -H "Authorization: Bearer <key>" \
  https://findlocal.community/api/events?city=boston | head -1             # 200
# loop past the plan's per-minute limit → 429 with Retry-After

# First-party stays open (no key)
curl -si "https://findlocal.community/api/events/map?bbox=-71.2,42.3,-71.0,42.4" | head -1  # 200
```
- **MCP**: connect Claude to `mcp.findlocal.community/mcp`, paste a real key at
  consent, run `search_events` then `get_usage` → `remaining` decrements; a
  disabled/over-quota key is blocked mid-session.
- **Billing**: Stripe **test mode** → complete a Payment Link checkout → webhook
  mints the Unkey key and emails it → key works on REST + MCP → cancel in the
  portal → key disabled → 401.

## Post-checkout UX (shipped) + self-serve lifecycle (DEFERRED — needs user identities)

**Shipped:** `/developers/welcome` is a branded post-checkout confirmation. Set it
as **each Payment Link's success URL**:
`https://findlocal.community/developers/welcome?session_id={CHECKOUT_SESSION_ID}`
(Stripe substitutes the session id). It fetches the session with the secret key
(so it only confirms a real, paid session), shows the customer's email + plan, and
reassures them the key is emailed. It does **not** display the key.

**What's covered today** — cancel / change-plan / update-card are self-serve via the
Stripe **customer portal** (`STRIPE_PORTAL_URL`); the webhook's
`customer.subscription.updated`→reprice and `.deleted`→revoke keep the Unkey key in
sync. Cancel-at-period-end keeps the key live until the period actually ends
(`.deleted` fires then).

**DEFERRED — requires user identities (no logins exist yet):**
- **Show the API key on-screen** at `/developers/welcome`. Blocked because Unkey
  reveals plaintext only once, at creation, and the webhook is the current minter —
  surfacing it needs mint/display coordination (idempotent on
  `subscription.metadata.unkey_key_id`, webhook as email-only fallback).
- **Self-serve rotate / lost / leaked key.** No flow exists; today it's manual via
  `findlocalinternal@gmail.com`. Because plaintext is never re-revealable, "lost",
  "leaked", and "rotate" collapse into ONE primitive: **rotate** = mint new + revoke
  old (old id is on `subscription.metadata.unkey_key_id`) + show/email new.
- **Usage/quota visibility on the web** (only MCP `get_usage` exists today).

Intended shape once identities land: a lightweight **email magic-link**
`/developers/manage` page (reuses Cloudflare Email Service) keyed off the Stripe
customer → shows plan + remaining quota, a **Rotate key** button, and a link to the
Stripe portal for billing. Until then, key issues are handled by support email.

## What's intentionally left open (not part of the paid contract)

`/api/events/map`, `/api/embed/events`, `/api/geo` and the `/embed/*` widgets stay
free/no-key — they run in the browser and can't hold a secret. `/api/events/map`
returns only compact pins (viewport-limited), so it's a weak substitute for the
keyed `/api/events`. Optional hardening later: reject cross-site calls to map/geo
via `Sec-Fetch-Site` (see `web/src/lib/apiScope.ts`).
