# Product polish — September 2026

Working notes for the `feat/product-polish-2026-09` branch. Each section states the
contract other consumers (the mobile app, the MCP worker, partners) can rely on.

## B1 Featured sort, map API, geo suggestion

Three changes, all additive: no existing parameter, response field or default
order changed for a machine consumer.

### 1. `sort=featured | date`

`sort` joins the shared filter contract (`shared/src/filters.ts`:
`EventSort`, `FILTER_KEYS`, `parseFilters`, `canonicalQuery`, `filtersToQuery`).

| Consumer | Default | Notes |
|---|---|---|
| Site feed (`loadFeed`, `/city/<slug>`) | `featured` (`SITE_DEFAULT_SORT`) | `?sort=date` for chronological |
| `GET /api/events` | `date` (`API_DEFAULT_SORT`) | accepts `sort=featured`; `meta.sort` echoes what was used |
| MCP `search_events` | `date` | new optional `sort` argument (`"date"` / `"featured"`) |
| `GET /api/events/map` | `featured` | a clipped viewport should keep the best rows |
| `listUpcomingEvents(db, f)` with `f.sort` unset | `date` | so nothing changes for a caller that doesn't opt in |

**Canonicalisation.** `canonicalQuery` keeps `sort=date` and *drops*
`sort=featured` (the site default), so `/city/boston?sort=featured` canonicalises
to `/city/boston`. `sort=date` therefore behaves like any other filter: the page
is `noindex` with a canonical back to the bare city page, and `robots.txt`
disallows `/*?sort=`. It is part of the edge-cache key (via `canonicalQuery`).

**Ranking** (all in SQLite, `shared/src/queries.ts` → `featuredOrder`; highest
first):

```
quality   image_url present and different from the venue image   +3
          image_url present but equal to the venue image        +1
          no image_url but the venue has one                    +1
          length(description) >= 200                            +2
          length(description) >= 60                             +1
          start_time present                                    +1
          price or price_amount present                       +0.5
          performers or author_ids non-empty                     +1
recency   event_date within 7 days                               +2
          event_date within 14 days                              +1
            (both dropped when the query is pinned to one day)
freshness first_seen_at within 7 days                            +1
jitter    deterministic, [0, 1.5), per (event id, calendar day)
```

`ORDER BY has_content DESC, score DESC, event_date, start_time IS NULL, start_time, id`

* **Hard rule:** `has_content = 0` (no image anywhere **and** no description)
  sorts after every other row regardless of score.
* **Jitter** is `((unicode(id[1])*31 + unicode(id[2])*17 + unicode(id[3])*7 +
  unicode(id[4])*3 + daySeed) % 150) / 100.0`, where `daySeed = jitterSeed(today)`
  is a small integer derived from the calendar date (SQLite has no `md5()`).
  It is constant for a whole day, so **paging is stable within a day** and the
  order reshuffles at midnight (in the city's zone).
* `events` has no `created_at`; **`first_seen_at`** is the freshness column.
* `series_image` is **not** consulted (the bounds query has no city to build the
  series CTE over, and both orders must agree).

**Rendering.** With `sort=featured` the list is a flat card grid — day headers
would be meaningless out of chronological order. `sort=date` keeps the sticky day
sections. `FeedState.sort` carries the effective value; `EventList` takes `flat`.

### 2. `GET /api/events/map`

```
GET /api/events/map?bbox=minLng,minLat,maxLng,maxLat
                   [&when=anytime|today|tomorrow|weekend|week|YYYY-MM-DD]
                   [&cat=<slug,slug>] [&free=1] [&paid=1] [&authors=1]
                   [&q=<text>] [&sort=featured|date] [&limit=1..400]
```

* `bbox` is **required** and in Leaflet's `toBBoxString()` order
  (`minLng,minLat,maxLng,maxLat`). Validation (`web/src/lib/mapQuery.ts` →
  `parseBbox`): four finite numbers, `min < max`, lat ∈ [-90, 90],
  lng ∈ [-180, 180], and **at most 4° on each side** — otherwise
  `400 { "error": "<reason>" }`.
* **No `city` parameter.** The box is the scope; one box may return two metros.
* `when` resolves in the time zone of the metro nearest the box centre
  (`nearestCity`). `when=anytime` (default) leaves `to` null — no upper bound.
* `limit` default 200, max 400. `meta.truncated` is true when the limit was hit.
* `Cache-Control: public, max-age=60, s-maxage=120`; `X-Robots-Tag: noindex`.

```jsonc
{
  "data": [
    {
      "id": "…uuid…",
      "title": "Trivia Night",
      "event_date": "2026-09-20",      // plain calendar day, never a timestamp
      "start_time": "19:00:00",        // or null
      "category": "nightlife",         // or null
      "image": "https://…",            // event artwork ?? venue image ?? null
      "venue_id": "…uuid…",
      "venue_name": "The Sinclair",
      "lat": 42.373,
      "lng": -71.119,
      "price_min": 0,                  // parsed USD or null
      "free": true,
      "path": "/event/…uuid…"
    }
  ],
  "meta": {
    "count": 187, "limit": 200, "truncated": false,
    "bbox": { "min_lng": -71.2, "min_lat": 42.3, "max_lng": -71.0, "max_lat": 42.4 },
    "from": "2026-09-16", "to": null, "sort": "featured"
  }
}
```

Query helper: `listEventsInBounds(db, MapEventOptions): MapEventRow[]` in
`shared/src/queries.ts` (plus `isValidBounds`, `MAP_MAX_LIMIT`,
`MAP_DEFAULT_LIMIT`, `MAP_MAX_SPAN_DEG`). Events whose venue has no coordinates
are absent by definition.

### 3. `near` / `radius_km` on `/api/events`

```
GET /api/events?near=<lat>,<lng>&radius_km=<km>   # default 25, max 200
```

Restricts to venues inside the bounding box implied by the radius and orders by
distance (nearest first, then chronological). Overrides `sort`
(`meta.sort` reports `"distance"`). Coordinates are rounded to 3 decimals
(~100 m) in both `parseFilters` and `canonicalQuery`, so the edge cache key does
not explode over GPS noise. Distance is a squared, latitude-scaled degree
expression — monotonic in real distance, and no `cos()`/`sqrt()` in SQL (D1 does
not guarantee SQLite's math extension). `robots.txt` disallows `/*?near=`.

This is the intended replacement path for the `region` chip on mobile.

### 4. `GET /api/geo` + the city suggestion

```
GET /api/geo  ->  { city: { name, slug, state, tz, lat, lng } | null,
                    point: { lat, lng } | null,   // rounded to ~1 km
                    source: "cf" | "none" }
```

`Cache-Control: private, no-store`, and `cachePolicyFor('/api/geo')` returns
`edge: 0` so the middleware never stores it — one shared edge copy would hand
every visitor the first colo's answer. `source: "none"` when `request.cf` has no
coordinates (local dev, some clients).

**The rendered page still never depends on geo headers** (caching + SEO rule in
CLAUDE.md). `GeoHint.astro` is a fixed-position, dismissible toast that, only
when there is no `fl_city` cookie and no `fl_geo_hint_dismissed` in
`localStorage`, fetches `/api/geo` after paint and offers a switch. Being
fixed-position it causes no layout shift. Accepting writes the same `fl_city`
cookie `CityPicker` writes.

### 5. Dynamic map

`LeafletMap.astro` gained `live` and `filters` props. With `live`, after the
first render it refetches `/api/events/map` on every `moveend` (debounced 400 ms,
previous request aborted), draws one **photo pin** per venue (circular thumbnail,
category-coloured ring via `web/src/lib/mapPins.ts` → `pinColor`, count badge
when a venue has more than one event in view) and a popup with image, venue,
and each event's title + date. Auto-refresh can be switched off (remembered in
`localStorage` as `fl_map_auto`), which reveals a **Search this area** button.
Without `live` — venue maps, the `/embed/events?view=map` widget — behaviour is
unchanged. The list view is not synced to map panning in this pass.

### Files

* `shared/src/filters.ts` — `EventSort`, `NearFilter`, `sort`/`near`/`radius_km`
  parsing + canonicalisation.
* `shared/src/queries.ts` — `featuredOrder`, `jitterSeed`, `near` where/order,
  `listEventsInBounds`, `isValidBounds`, `MapEventRow`.
* `web/src/lib/mapQuery.ts` (new) — `parseBbox`, `parseMapParams`.
* `web/src/lib/mapPins.ts` (new) — `pinColor`, `groupByVenue`, `pinDateLabel`,
  `bboxParam`, the `/api/events/map` row type.
* `web/src/pages/api/events/map.ts`, `web/src/pages/api/geo.ts` (new).
* `web/src/lib/feed.ts` — `sort` in `FeedState`, `SORT_CHIPS`, `mapFilterQuery`.
* `web/src/components/` — `LeafletMap`, `EventMap`, `EventList` (`flat`),
  `Feed`, `FilterBar`, `FilterSheet`, `GeoHint` (new).
* `workers/mcp/src/mcp.ts` — `sort` on `search_events`.
* Tests: `shared/test/featured.test.ts`, `web/test/mapQuery.test.ts`,
  `web/test/mapPins.test.ts`.

## B3 Platform landing + city copy

**Widgets, the API and the MCP server were invisible.** `/` used to be a second
copy of the Boston feed; it is now the platform landing page, and discovery lives
on `/city/<slug>` (and, from here on, mainly in the app). No event URL changed.

### `/` — the landing page (`web/src/pages/index.astro`)

SSR, per-city (the `fl_city` cookie picks the CTA city, the example widget and the
highlighted metro), **3600 s at the edge** (`cachePolicyFor('/')`, was 600) with
`private, no-cache` to browsers as before. Sections:

1. **Hero** — H1, lede, `Explore events in <city> →` (`/city/<slug>`), widget/docs
   buttons, and six live stat tiles.
2. **Four ways in** — Widgets (script tag + a **live `/embed/events` iframe**),
   JSON API (curl), MCP server (`mcp.json` snippet), Catalogue (what we index, how
   it is sourced, cadence, what you can build).
3. **How it's different** — primary sources vs resale feeds, author **and** book
   tagging, recurring rules with evidence, daily updates + retirement.
4. **Coverage** — every metro with its live upcoming count, linking to its city
   page (`web/src/components/MetroCoverage.astro`).
5. **Start where you are** — venue / newsletter / app / browsing, plus an "iOS app
   coming soon" placeholder (`FindLocalMobile` has no App Store id yet:
   `docs/app-store.md` is still a runbook, so no link is fabricated).

JSON-LD: `Organization` + `WebSite` + `WebApplication`. Only existing client JS is
used (`lib/copy.js` for the copy buttons); the widget example is a lazy iframe with
a fixed height, so the page ships no new script.

### Live stats (`shared/src/stats.ts`, new)

`platformStats(db)` — **two statements in one `db.batch()`**:

1. one pass over the upcoming-events index grouped by **(source, city)**. That
   single scan yields the totals, the 30-day window, the primary/partner split,
   author and author+book events, `eventsByCity` (the coverage list — so the page
   needs no separate `countUpcomingEventsByCity` call), `authorEventsByCity`
   (which decides whether the example widget can be city-scoped) and `metrosLive`
   (= `eventsByCity.size`). ~78k rows read on prod.
2. scalar subselects for active venues, active venues with an upcoming event, and
   the `authors` / `books` gazetteer sizes. "Live venues" uses `EXISTS` rather
   than `COUNT(DISTINCT venue_id)` over a join: same answer (3,234), 36k rows read
   instead of 147k.

Total ≈ **114k rows read / ~185 ms per uncached render**, once an hour per
(colo, cookie city).

`countUpcomingEventsWithin(db, city, days, tz)` backs the city page's subhead.

**Primary vs partner is classified on `events.source`, not `venues.source_type`:**

```
PRIMARY_SOURCES = scraper_cloudflare | scraper_static | scraper_local | recurring
partner         = everything else (ticketmaster, stubhub, seatgeek, dice,
                  ovationtix, nps, bookmanager)
```

A venue can be scraped today and still hold rows ingested from an API earlier, so
the row's own column is the truthful one. On prod (2026-09-16) the venue-level view
would have claimed **94%** primary while the event-level view says **67%** — the
difference is 14,623 upcoming rows still carrying `source='ticketmaster'` from the
pre-D1 era (migration `0004` / `scripts/migrate_tm_to_stubhub.py` are still
pending in FindLocalData). Retiring those lifts the honest number to ~91%.

Prod numbers observed while building this: 54,260 upcoming events (30,549 in the
next 30 days), 10,405 active venues (3,234 with something upcoming), 83/83 metros
live, 36,114 primary vs 18,146 partner (67%), 2,171 author-linked events of which
1,343 have **both** an author and a book, 2,635 authors and 1,840 books.

### `/platform` → `/` (301)

`redirectTargetFor` gained `/platform` → `/` (`shared/src/seo.ts`), and
`web/src/pages/platform.astro` was **deleted** — a prerendered page is served by
Workers assets before the middleware, so leaving the file would have shadowed the
redirect. `/platform` also left `STATIC_PATHS` in `sitemaps/[name].xml.ts`,
`llms.txt`, `DocsNav.astro`, the footer, and the about/privacy/terms/blog links.

### Nav + footer (`web/src/layouts/Layout.astro`)

Header nav is now **Explore** (→ `/city/<cookie city>`), **Widgets**, **API**,
**MCP**, **Developers**. The footer grew a "Build with Find Local" row
(Developers / Widgets / JSON API / MCP server / llms.txt) and the site row picked
up Venues plus the iOS-app placeholder.

### City page copy (`web/src/pages/city/[slug].astro`)

* H1: `Things to do in Boston` (was `Things to do in Boston, MA`).
* Subhead: **one** line — `1.3k+ things to do in Boston this month`
  (`approxCount` in `web/src/lib/format.ts` rounds **down**: 2,423 → `2.4k+`,
  2,000 → `2k+`, 640 → `640+`; the count is the next 30 days, so "this month" is
  literally true).
* The old descriptive sentence moved below the feed into
  `web/src/components/CityBlurb.astro`, which appends a **per-city** sentence.

### `City.blurb` (both repos)

`blurb` is a required field on every one of the **83** metros in
`FindLocalData/src/data/cities.json` (one specific sentence about what that metro's
event scene is known for — venues, festivals, institutions; no "vibrant scene"
filler). `src/cities.py`'s `City` dataclass and `shared/src/cities.ts`'s `City`
interface both declare it, so a missing blurb fails loudly on load. The FE copy was
refreshed with `npm run sync-data` (never hand-edited).

### Files

* New: `shared/src/stats.ts`, `shared/test/stats.test.ts`,
  `web/src/components/MetroCoverage.astro`, `web/src/components/CityBlurb.astro`.
* Rewritten: `web/src/pages/index.astro`. Deleted: `web/src/pages/platform.astro`.
* Changed: `shared/src/index.ts`, `shared/src/seo.ts`, `shared/src/cities.ts`,
  `web/src/layouts/Layout.astro`, `web/src/pages/city/[slug].astro`,
  `web/src/lib/format.ts` (`approxCount`), `web/src/lib/cacheHeaders.ts`,
  `web/src/pages/llms.txt.ts`, `web/src/pages/sitemaps/[name].xml.ts`,
  `web/src/components/DocsNav.astro`, `about/privacy/terms` + four blog posts
  (`/platform` links), `shared/test/pure.test.ts`, `web/test/cacheKey.test.ts`,
  `web/test/format.test.ts`.
* FindLocalData: `src/data/cities.json` (83 blurbs), `src/cities.py`.
