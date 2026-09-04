# FindLocal Events MCP server (OAuth + metered)

Remote [MCP](https://modelcontextprotocol.io) server exposing FindLocal's curated
local-event data as tools a business customer can connect to Claude — gated by
OAuth and metered per customer. Runs at `https://mcp.findlocal.community/mcp`
(Cloudflare Worker `findlocal-mcp`). Ported 2026-09 from Supabase to the D1
`findlocal` database; all queries go through `@findlocal/shared` (`queries.ts`),
so results match the website exactly.

## Tools

| Tool | What it does |
|------|--------------|
| `search_events` | Primary tool. Upcoming events by `city` (name or slug) + `when`/date range, `category`, `price_max`/`free_only`, `time_of_day`, `region`, free-text `query`. Returns `{city, total_matched, returned, events}`. |
| `get_event` | Full detail for one event id (incl. description); `{found, expired, delisted, event}`. |
| `list_venues` | Active venues in a city/region, with address, coordinates, upcoming counts. |
| `get_venue` | Look up a venue by id, or fuzzy-search by name (optionally within a city). |
| `list_categories` | Category slugs `search_events` accepts, with upcoming counts per city. |
| `get_events_at_venue` | Upcoming events at a venue id. |
| `get_usage` | This account's current-month usage + remaining quota (not metered). |

## Commands (run from the FindLocalFE root)

```bash
npm install --legacy-peer-deps           # see gotchas
cp workers/mcp/.dev.vars.example workers/mcp/.dev.vars
npm run dev:mcp                          # http://localhost:8787/mcp (local D1 is empty)
npm run deploy:mcp                       # typecheck + tests + wrangler deploy
npx wrangler secret put COOKIE_ENCRYPTION_KEY --config workers/mcp/wrangler.toml
```

Point the local worker at real data with `wrangler dev --remote` (uses the
production D1 binding) or seed the local D1 via the data-api migrations.

Seed demo customers in `USAGE_KV` (`customer:<key>` records; add `--remote` for prod):

```bash
npx wrangler kv key put --binding USAGE_KV --remote "customer:demo-pro" \
  '{"plan":"pro","monthly_quota":10000,"active":true}' --config workers/mcp/wrangler.toml
```

Test with the MCP Inspector (`npx @modelcontextprotocol/inspector`, Streamable HTTP)
or `claude mcp add --transport http findlocal https://mcp.findlocal.community/mcp`.

## Architecture

```
Claude.ai / Claude Code ──OAuth──▶ workers-oauth-provider ──▶ FindLocalMCP (Durable Object)
                                          │                        │  tools → @findlocal/shared queries
                                          ▼                        ▼
                                    OAUTH_KV (grants)        D1 `findlocal` (read-only by discipline)
                                                                   │
                                                             USAGE_KV (per-customer metering)
```

| File | Role |
|------|------|
| `src/index.ts` | Entry — `OAuthProvider` wrapping the MCP agent (`/mcp`, `/sse`). |
| `src/mcp.ts` | `FindLocalMCP extends McpAgent` — tool registration + the metering gate; maps tool params to `EventFilters`. |
| `src/shape.ts` | Response shapes (`shapeEvent` / `shapeVenue`), kept compatible with the Supabase-era output (+`category`, −`location`/`cover_image`). |
| `src/auth.ts` | OAuth consent screen; completes the grant with `{ customerId, plan }` props. |
| `src/metering.ts` | KV quota check + usage increment. |
| `src/types.ts` | `Env` bindings + customer types. |

## Gotchas

- **`--legacy-peer-deps`** on install: `@cloudflare/workers-oauth-provider` pins an
  older `@cloudflare/workers-types`. Root `package.json` `overrides` dedupe
  `@modelcontextprotocol/sdk` (must match the copy `agents` bundles) and workers-types.
- The worker must use the **same zod major as the root** (zod 4) — a second zod copy
  under `workers/mcp/node_modules` makes the MCP SDK tool typings explode (TS2589).
- `ai` is a dependency only because the `agents` SDK has an optional dynamic `import("ai")`.
- `McpAgent` is deprecated in favour of `createMcpHandler` but remains the best-supported
  path for OAuth `this.props`.
- `event_date` is a plain `YYYY-MM-DD`; `when` buckets are resolved in the city's time zone.
