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

## B5 Widget filters

**The widget was a fixed pane of glass.** `/embed/events` rendered whatever the
partner's `data-*` attributes said and the only thing a visitor could change was
the view tabs (plus "Author events" on literary widgets). Owner feedback: *"you
can't filter within the widget except by author talk or not. You should be able
to search nearby, filter by free, paid, time, all of that."*

### 1. The in-widget toolbar

A compact toolbar sits under the tabs on every preset (`data-filters="off"`
brings back the old pane):

| Control | URL key | Notes |
|---|---|---|
| Search | `q` | title / venue / performer, debounced 350 ms |
| When | `when` | anytime · today · this weekend · this week · **this month** |
| Dates | `from`,`to` | explicit range, wins over `when` |
| Time of day | `tod` | morning · afternoon · evening |
| Price | `free=1` / `paid=1` | segmented Any / Free / Paid (`price=free\|paid` is the no-JS form spelling of the same thing) |
| Category chips | `ucat` | only when the partner did **not** pin `cat` |
| Authors only | `authors=1` | literary presets (replaces the old link chip) |
| Near + radius | `near=<lat>,<lng>`, `radius_km`, `place` | zip / city / address box, 5·10·25·50 km, plus "Use my location" |

`cat` is the partner's **pin**: with it set the chips disappear and the visitor
stays inside the category. `ucat` is the visitor's own choice and is ignored
while a pin is in force — that separation is what lets the toolbar write its
state back into the URL without the widget looking "pinned" on the next load.
The visitor's chips never change `utm_campaign` (attribution stays the
partner's).

`near` **replaces** the region/city scope: `events` is city-partitioned, so a
proximity search resolves the point to the nearest supported metro
(`embedScope` → `nearestCity`) and lets the bounding box + distance order do the
narrowing. `meta.sort` reports `distance`.

`when=month` is the widget's own bucket (`embedWhenRange`, the next 30 days) —
the site contract keeps today/tomorrow/weekend/week.

### 2. `GET /api/embed/events`

```
GET /api/embed/events?<exactly the /embed/events query contract>
->  { data: EventCard[], markers: MapMarker[], meta: {...} }
```

`EventCard` is what `embedCard.ts` builds — `{ id, title, date, time, venue,
place, url (UTM'd), path, price, buyUrl, thumb {src,kind,alt}, authors
[{name,href}] }` — i.e. the enrichment (book cover → author photo → event →
venue → category art; credited Bookshop links; exact-ISBN "Buy the book") is
computed **once, on the server**, and the client JS only paints it. `meta`
carries `scope`, `heading`, `tz`, `from`, `to`, `count`, `limit`, `truncated`,
`sort`, `authors_only`, `categories`, `near`, `center`, `buy_rel`, `see_all`.
404 for an unknown region/city/category, like the page. Cached like every other
`/api/*` route: 300 s at the edge, keyed on the full sorted query.

### 3. No parent-page reloads

The embed page still server-renders its initial state (SEO, no-JS, and the
edge-cached first paint are unchanged). With JS the toolbar fetches the JSON
endpoint, repaints the list, re-indexes the calendar, rebuilds the map panel and
`history.replaceState`s the new query into the **iframe's** URL — the host page
never navigates or scrolls. Partners can copy a filtered frame's query straight
into `data-*` attributes to ship it as the starting state. The existing
`postMessage({type:'findlocal:resize'})` beacon (EmbedLayout's ResizeObserver)
keeps the host iframe sized as the list grows and shrinks.

Map redraw needs no `LeafletMap` API: the panel gets a **fresh** `.fl-map`
element with new `data-markers`, and the component's global `fl:map-show`
listener initialises it. Embed markers now carry the row's thumbnail and
category, so the widget map gets the same photo pins the site has.

Region-group widgets (`region=new-england`) query `listUpcomingEventsForCities`,
which takes cities/categories/dates/authors only; the toolbar's price, time-of-day
and text filters are applied in JS over an oversampled window
(`matchesEmbedFilters`, mirroring `queries.ts::buildWhere`; 5× the limit, capped
at 500 rows). Single-city and `near` widgets go through `parseFilters` +
`listUpcomingEvents` and filter entirely in SQL.

### 4. Geocoding

`web/src/lib/geocode.ts` — Photon (`https://photon.komoot.io/api/`) first,
Nominatim as the fallback, US results only, one request per second app-wide,
never throws (a dead geocoder yields `[]` and the widget keeps its list). It is
the web twin of `FindLocalMobile/src/lib/geocode.ts`: same providers, same shape
(`geocode(q)` here == `searchPlaces(q)` there), so a fix ports in one line.
The identifying `User-Agent` Nominatim's policy wants is sent only off-browser
(browsers refuse to set it and send their own). "Use my location" uses
`navigator.geolocation`, rounds to 3 decimals (~100 m) and never sends anything
anywhere else; `widget.js` therefore delegates `allow="geolocation"` — and keeps
`allow="geolocation 'none'"` when the toolbar is off.

### 5. New `data-*` attributes

`data-filters="on|off"`, `data-near="<lat>,<lng>"`, `data-radius="<km>"`,
`data-free="1"` — mirrored in `public/widget.js` and `buildEmbedSrc`, documented
and wired into the snippet builder on `/developers/widgets`.

### Files

* `web/src/lib/embed.ts` — `EmbedUiState`, `readUiState`, `uiQuery`,
  `uiStateIsEmpty`, `EMBED_UI_KEYS`, `EMBED_WHENS`/`embedWhenRange`,
  `EMBED_RADII_KM`, `embedScope`, `matchesEmbedFilters`, `parseNear`/`nearPoint`,
  `filtersOff`, and `filtersOn`/`pinnedCategories`/`near`/`ui` on `EmbedParams`.
* `web/src/lib/embedData.ts` (new) — the one loader both front doors use
  (scope → rows → enrichment → cards + markers + heading + centre).
* `web/src/lib/geocode.ts` (new) — Photon/Nominatim forward geocoding.
* `web/src/pages/api/embed/events.ts` (new) — the JSON endpoint above.
* `web/src/pages/embed/events.astro` — toolbar markup + in-place re-render.
* `web/src/lib/embedCard.ts` — `path` and `price` on `EventCard`.
* `web/public/widget.js`, `web/src/pages/developers/widgets.astro`.
* Tests: `web/test/geocode.test.ts` (new), plus the B5 blocks in
  `web/test/embed.test.ts` and `web/test/widget.test.ts`.

### Known edge

`/` embeds the example widget in a fixed-height (`420px`) iframe with no resize
listener, so the toolbar eats into the six rows it shows. Raising that height or
listening for `findlocal:resize` in `index.astro` is a one-line follow-up in that
file (owned elsewhere this pass).

## B6 Integration + QA

The clean-up pass over wave one: wiring the migration-0013 columns through the
query layer, making `/map` land somewhere that actually has a map, giving the
`fl_city` cookie a single writer, and showing book covers on feed cards. Plus a
browser pass at 390 px and 1440 px that found three real bugs.

### 1. Provenance columns reach the UI (`shared/src/queries.ts`, `types.ts`)

`web/src/lib/enrichment.ts` was written defensively against columns the query
layer did not select yet. It selects them now:

```
VENUE_COLS  += v.wikidata_id, v.wikipedia_url, v.image_attribution,
               v.image_source, v.description_source        (migration 0013)
AUTHOR_COLS += bio (0010), wikipedia_url, photo_attribution (0013)
```

`VenueRow` and `AuthorRow` declare them (all `string | null`), so every venue
read (`getVenue`, `listVenues`, `searchVenuesByName`) and every author read
(`authorsByIds`, `attachAuthors`) carries them. Verified in the browser: a
Commons-sourced venue image now prints its credit line and a "Read more on
Wikipedia" link on `/venue/<id>`, and an author's bio + photo credit render on
`/event/<id>`.

**Contract note:** `/api/venues` serialises `VenueRow` whole, so it gained five
nullable fields — additive, documented in `/developers/api`'s venue field table.
The MCP `shapeVenue` is an explicit allowlist and was **not** touched, so the MCP
contract is unchanged. Tests: two cases in `shared/test/queries.test.ts` (one
enriched venue/author, one bare, asserting `null` rather than `undefined`);
`shared/test/seed.ts` stamps the provenance onto The Sinclair and Ada Debut.

### 2. `/map` and `/?view=map` land on the feed

`/` is the platform landing page and ignores `view=map`, so both entry points
were dead ends. Now:

```
/map           -> /city/<fl_city cookie, else boston>?view=map   (301)
/?view=map     -> /city/<fl_city cookie, else boston>?view=map   (301)
```

* `redirectTargetFor(pathname, citySlug = DEFAULT_CITY_SLUG)` (`shared/src/seo.ts`)
  takes the slug and stays pure; the middleware passes `locals.city.slug`, so the
  redirect follows the cookie (`/map` with `fl_city=New York` → `/city/new-york?view=map`).
* `/?view=map` depends on the query, not the path, so the **middleware** owns that
  case; it drops `view` from the forwarded query and keeps every other param
  (`/map?when=today&cat=music` → `/city/boston?view=map&when=today&cat=music`).
* `resolveCity` moved above the redirect block (one cookie parse, used by both).
* `hasMapView('/')` is now **false** — keying `/` on `view=map` would only ever
  store a redirect under a second key. `isCityCookieRoute('/')` stays **true**:
  the landing page really does vary by cookie (Explore CTA, example widget city,
  highlighted metro). Both pinned in `web/test/cacheKey.test.ts`.
* Internal links that pointed at `/?view=map` (`about.astro`, the weekend blog
  post) now point at `/map`, the one cookie-aware shortcut.

### 3. One writer for the `fl_city` cookie (`web/src/lib/cityCookie.ts`, new)

`CityPicker` claimed to be the only writer; `GeoHint`'s accept handler was a
second, hand-rolled copy of the same string. Both now call
`setCityCookie(city.name)`; `cityCookieHeader()` is pure and pinned in
`web/test/cityCookie.test.ts`, and `cacheKey.ts` re-exports `CITY_COOKIE` from
the new module so the name has one definition. This matters because the cookie's
*value* is part of the edge-cache key — a stray `Path` or a double-encoded name
would split the cache silently. CLAUDE.md's cookie rule was rewritten to say
"write it only through `setCityCookie`" instead of naming one component.

### 4. Literary covers on feed cards (`web/src/lib/feed.ts`)

`listUpcomingEvents` attaches neither `books` nor `authors`, so `bestEventImage`'s
literary chain (book cover → author photo) only fired on the event page and in
the embed. `attachLiteraryThumbs(db, events)` fills them in for the **current page
only**:

* zero queries when no event on the page has `author_ids`/`book_ids`;
* otherwise two, run in parallel over just the linked subset, each batched over
  the distinct ids and chunked under D1's 100-bind cap inside `attachBooks` /
  `attachAuthors`.

Called from `loadFeed`, which only `/city/<slug>` uses — **`/api/events` is
untouched**, so its response shape is unchanged. Verified in the browser: the
card for a book-linked event renders
`<img class="shot book contain" src="…covers.openlibrary.org/b/id/8231856-M.jpg"
alt="Cover of The Overstory">`. Test: `web/test/feedLiterary.test.ts` (the first
`web/test` suite to use the miniflare D1; `web/test/env.d.ts` declares
`cloudflare:test` for `astro check`).

### 5. Dead code removed

* `Layout.astro`: `.thumb .placeholder` (the old teal-gradient placeholder — the
  category art replaced it and nothing emits `class="placeholder"`) and
  `.fl-marker` (superseded by `.fl-pin`; `divIcon` is created with
  `className: ''`). `EmbedLayout.astro` still carries its own `.fl-marker` copy —
  left alone, it belongs to the concurrent embed work.
* A class-by-class sweep of every `<style>` block in `web/src` found nothing else
  dead: `DocsNav`'s globals, `venue/[id]`'s `.fl-map`, `event/[id]`'s
  `:global(.report)` and the Leaflet overrides are all live.
* `web/public/art/_sheet.html` → `web/art-sheet.html`. Everything under `public/`
  is served by Workers assets, so the contact sheet was a live URL; its `./x.svg`
  references became `./public/art/x.svg`. `categoryArt.test.ts` gained a case
  asserting `public/art/` holds nothing but the SVGs and `README.md`.

### 6. Browser QA — three bugs found and fixed

`astro dev` + Playwright at **390 × 844** and **1440 × 900** over `/`,
`/city/boston`, `/city/boston?view=map`, `/venue/<id>` and `/event/<id>`. No page
scrolls horizontally at either width (`scrollWidth === clientWidth` on all ten)
and no console errors. Three real findings:

1. **The report popover ran off the right edge of a phone.** The flag moved to the
   *right* end of the `h1` row in wave one, but `ReportButton`'s
   `@media (max-width: 480px) { .menu { right: auto; left: 0 } }` still anchored
   the panel's **left** edge to it: a 340 px panel starting at x≈259 on a 390 px
   screen, 209 px off-screen. On phones it is now a bottom sheet
   (`position: fixed; left/right: 1rem; bottom: 1rem + safe-area`, `max-height:
   75vh`, `z-index: 1200` — above the filter FAB at 1100 and the geo toast at
   1050). Measured after: `left: 16, right: 374` inside a 390 px viewport.
2. **Every scraped image URL with a space or comma lost its 2× candidate.**
   `EventCard`'s `srcset` is built from the raw URL, and in `srcset` a space ends
   the URL while a comma starts the next candidate — Chrome logged "Dropped
   srcset candidate https://www.burren.com/images/friday" for
   `…/friday session.jpg`. 14 of 500 local rows have a space, 6 a comma. New
   `srcsetUrl()` in `shared/src/images.ts` percent-encodes exactly those two
   characters (idempotent; `src` needs no such treatment). Warnings gone, and no
   `img[srcset]` on the feed still holds a raw space.
3. **The landing page's metro list was one 83-row column on phones.**
   `MetroCoverage` only went two-up at 520 px, adding ~2,900 px of scroll. Two
   columns from 0 px (a row is `<city> <state> … <count>`, and the name
   ellipsises rather than wraps): the phone landing page went 9,681 px → 8,131 px
   with no row ellipsised at 390 px.

**Live map exercised for the first time** (B1 never ran it in a browser) — it
works as specified, no fixes needed: first render fires
`/api/events/map?bbox=-71.4201,42.2458,-70.6881,42.5288` and draws 67 pins
("146 events in view"); dragging fires exactly one new bbox request after the
debounce and the pins re-render (36 pins, "71 events in view"); unchecking
Auto-update stops the refetch, clears the status and reveals **Search this area**,
which fires the request on click (66 pins) and hides itself again; the popup shows
the venue, event title and date. No console errors, and no duplicate/unaborted
requests (3 requests across 3 deliberate loads).

Screenshots: `web_{landing,city,citymap,venue,event}_{phone,desktop}.png`,
`web_report_open_{phone,desktop}.png`, `web_map_live_{initial,panned,searcharea,popup}.png`,
`web_landing_phone_coverage.png` in the session scratchpad.

### 7. Elsewhere

`FindLocalData/CLAUDE.md` said "31 US metros" in its overview; it is 83
(`cities.json`). That one line was corrected — no other change in that repo.

### Files

* `shared/src/queries.ts` (VENUE_COLS/AUTHOR_COLS), `shared/src/types.ts`,
  `shared/src/seo.ts` (`DEFAULT_CITY_SLUG`, `redirectTargetFor(path, citySlug)`),
  `shared/src/images.ts` (`srcsetUrl`).
* New: `web/src/lib/cityCookie.ts`, `web/test/cityCookie.test.ts`,
  `web/test/feedLiterary.test.ts`, `web/test/env.d.ts`, `web/art-sheet.html`
  (moved out of `public/`).
* `web/src/middleware.ts`, `web/src/lib/cacheKey.ts`, `web/src/lib/feed.ts`,
  `web/src/components/{CityPicker,GeoHint,EventCard,ReportButton,MetroCoverage}.astro`,
  `web/src/layouts/Layout.astro`, `web/src/pages/about.astro`,
  `web/src/pages/developers/api.astro`, `web/public/art/README.md`,
  `web/src/content/blog/how-to-find-things-to-do-this-weekend.md`.
* Tests touched: `shared/test/{seed,queries,books,pure,images}.test.ts`,
  `web/test/{cacheKey,categoryArt,imageChain,embedCard,jsonld}.test.ts`.
* `CLAUDE.md` (301 table, canonical note, `fl_city` writer rule);
  `FindLocalData/CLAUDE.md` (metro count).
