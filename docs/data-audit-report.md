# FindLocal Data Audit

**Date:** 2026-05-11
**Project ref:** `tonjvnfbywjssehdvlvp`
**Method:** SQL against `events_gold`, `old_events`, `venues`, `event_community_assignments`, `communities` via Supabase Management API. Cross-referenced against frontend code reading those tables.

---

## Top findings (ranked by user-visible impact)

| # | Issue | Scope | Symptom |
|---|---|---|---|
| 1 | **2,026 soft-deleted events have future dates and are served to Discover.** `getEvents()` (`src/api/events.ts:13`) does not filter `is_deleted`. | 1,648 NY + 378 Boston | ~36% of "upcoming" events in NY and ~39% in Boston are zombie rows. Either the FE pipeline should add `.eq('is_deleted', false)` or the data side should physically delete / archive them. |
| 2 | **The 12 hardcoded category filter chips can never match any event.** Chip values are lowercase slugs (`music`, `comedy`, `art`, `food_drink`, …) but `event.event_type` holds capitalized strings (`"Music"`) and `event_community_assignments.community_id` holds UUIDs. `eventHasCategory()` (`src/hooks/useEvents.ts:44`) compares with case-sensitive `includes` — no match path. | Every category filter, both cities | Selecting any category chip returns zero results. Needs either (a) a `slug` column on `communities` mirroring the chip values, plus lowercase normalization of `event_type`, or (b) coordination with FE to swap chip values to community UUIDs. |
| 3 | **Taxonomy is much narrower than the UI suggests.** `communities` has only 5 rows (Music, Culture, Comedy, Theater, Dance) but the FE exposes 12 chips. Even if the slug mismatch in #2 is fixed, 7 chips have *no rows to match*: Food & Drink, Family Friendly, Markets, Workshops, Fitness, Nightlife, Community, Festival. | 7 of 12 chips | These chips would still return zero results. Either add communities or remove the chips. |
| 4 | **209 upcoming events will render as blank tiles on web** (no `image_url` *and* no `venue.image`). The `record.png` fallback chain is broken on web (CLAUDE.md #7), so missing data = empty 16:9 box. | 194 NY + 15 Boston | The card has no fallback because the runtime fallback is broken. Either backfill `image_url` from venue/source or add a working placeholder URL. |
| 5 | **121 past events are still sitting in `events_gold`** ordered first by ASC date. The Discover query orders by `event_date ASC` and never date-filters, so these are the first rows users see. | 90 NY + 31 Boston | Either run the gold→old promotion job more aggressively, or accept that the FE will need a `gte('event_date', today)` filter. CLAUDE.md #1 / #8 are the same bug pair. |

---

## A. Image coverage

| Query | Result |
|---|---|
| Upcoming events with no `image_url` AND no usable `venue.image` (blank tile on web) | **209** (NY 194, Boston 15) |
| Upcoming events rescued by `venue.image` (no `image_url` but venue has one) | 739 |
| Active venues with no `image` at all | 20 (NY 10, Boston 5, **Burlington 5**) |
| `image_url` values that don't start with `http(s)://` | 0 ✅ |
| Total upcoming events missing `image_url` | 948 |

**FE behavior:** card image chain is `event.image_url → venue.image → require('record.png')`. Per CLAUDE.md #7, the `require` fallback silently fails on web — so anything that falls past `venue.image` renders blank.

**Pipeline fix:** backfill `image_url` from scraping source; ensure every venue has an `image`; or replace the require fallback with a URL-based placeholder. The 739 "rescued" rows are dependent on the venue image — if a venue image rots, those 739 events also go blank.

---

## B. Stale / leaked data

| Query | Result |
|---|---|
| Past events still in `events_gold` (`event_date < CURRENT_DATE`) | **121** (NY 90, Boston 31) |
| Soft-deleted rows in `events_gold` (`is_deleted = true`) | **2,028** |
| Soft-deleted rows that are *upcoming* (still served by Discover) | **2,026** (NY 1,648, Boston 378) |
| Rows with NULL `event_date` | 0 ✅ |
| Total rows in `old_events` (archive) | 21,299 |
| Upcoming rows with cancellation-y `status` text (`Canceled`, `Postponed`, `Sold Out`, `Past Event`, etc.) | **155** |

**FE behavior:** `getEvents()` only filters `city` and `region` — no `is_deleted`, no date floor, no status check. The `is_deleted` filter exists only in `getMyCreatedEvents()` (`src/api/events.ts:793`), which is dead code today (auth is not wired).

**`status` column observation:** there are **64 distinct values** in `status` and **5,052 NULL**. The values are scraped free-form text — refund policies, capacity strings, ticket-button labels, even truncated event descriptions. It is not a normalized field. Treating it as an enum (e.g. filtering `status = 'published'`) is not possible without a cleanup pass. Likely fixes:
- Decide on a small controlled vocabulary (`active | canceled | sold_out | past`)
- Either backfill from the existing free text or drop the column entirely and recompute downstream.

**Pipeline fix:** run a job that moves `event_date < today` AND `is_deleted = true` rows out of `events_gold` (into `old_events` or just delete the deleted ones). Normalize `status`.

---

## C. Filter taxonomy alignment (the big one)

### Frontend chips (`src/components/FilterControls.tsx:16-29`)

| Chip label | Chip `value` (what filter compares) |
|---|---|
| Live Music | `music` |
| Comedy | `comedy` |
| Theater | `theater` |
| Art & Culture | `art` |
| Food & Drink | `food_drink` |
| Family Friendly | `family` |
| Markets | `market` |
| Workshops | `workshop` |
| Fitness | `fitness` |
| Nightlife | `nightlife` |
| Community | `community` |
| Festival | `festival` |

### Database `communities` table

| id (UUID) | name | level |
|---|---|---|
| `463d7fa4…` | Music | 1 |
| `ce71839c…` | Culture | 1 |
| `6bf6cde3…` | Comedy | 1 |
| `8c253ad7…` | Theater | 1 |
| `32ee1d02…` | Dance | 1 |

### Frontend `eventHasCategory` matcher (`src/hooks/useEvents.ts:44`)

```ts
if (event.event_type.some((t) => categoryIds.includes(t))) return true;
if (event.event_community_assignments.some((a) => categoryIds.includes(a.community_id))) return true;
```

- `categoryIds` = chip values, lowercase slugs: `'music' | 'comedy' | …`
- `event.event_type` = arrays of *capitalized* strings: `["Music","Culture","Comedy"]`
- `community_id` = UUIDs

**Neither comparison can ever match.** All 12 chips return zero results today.

### Cross-walk: which chips *could* work after a fix?

| Chip slug | Matching `community` row | Likely matching `event_type` value | Future events assigned |
|---|---|---|---|
| `music` | Music ✅ | "Music" | 4,206 |
| `comedy` | Comedy ✅ | "Comedy" | 2,638 |
| `theater` | Theater ✅ | "Theater" | 456 |
| `art` | Culture (close but not exact) | "Culture" | 3,363 |
| *(implicit)* `dance` | Dance ✅ | — | 159 |
| `food_drink` | ❌ none | ❌ none | 0 |
| `family` | ❌ none | ❌ none | 0 |
| `market` | ❌ none | ❌ none | 0 |
| `workshop` | ❌ none | "Workshop" (a few) | 0 in `communities` |
| `fitness` | ❌ none | ❌ none | 0 |
| `nightlife` | ❌ none | ❌ none | 0 |
| `community` | ❌ none | "Community Event" (free text) | 0 in `communities` |
| `festival` | ❌ none | ❌ none | 0 |

**Other data points:**
- Distinct `event_type` array values (first 50 inspected) are scraped free-form sub-genres: `Jazz`, `Live Music`, `Pop`, `Rock`, `Folk`, `Classical`, `Alternative`, `Stand-up`, `Improv`, `Open Mic`, `Comedy Show`, `Performance`, `Workshop`, `Art Exhibition`, `Community Event`, `Play`, `Tour`, `Film`, `Seminar`, plus the price markers `Free` and `Paid` (which is suspicious — they look like price labels, not categories, leaking into the type array).
- 39 upcoming events have **no** `event_community_assignments` row at all — invisible to the category filter regardless of fixes.
- 151 upcoming events have an empty `event_type` array — same problem.

**Pipeline fixes (pick one):**
- **(a)** Add a `slug` column to `communities` matching the FE chip values, expand the table to cover all 12 chips, and have the FE compare on `slug` (1 small FE change, all the data work on your side).
- **(b)** Normalize `event_type` to lowercase tokens that match the chip slugs, and either kill the `communities` join or align `community_id` semantics.
- **(c)** Drop the 7 chips that have no underlying data and only ship 4–5 working categories.

---

## D. Region filter

| Query | Result |
|---|---|
| Region chips per city (from active venues) | Boston: Boston (49), Cambridge (16), Somerville (4), Jamaica Plain (2), Arlington (1), Brookline (1), Medford (1), *NULL (2)* · NY: Manhattan (106), Brooklyn (54), **"New York" (27)**, Bronx (2), Staten Island (1), **Ridgewood (1)** · **Burlington exists** with 5 venues all NULL region |
| Active venues with NULL `region` | 7 (Burlington 5, Boston 2) |
| Upcoming events whose `region` doesn't match any active venue's region for that city | 0 ✅ |
| Upcoming events with NULL `region` | 3 (Boston) |

**Frontend behavior:** chips come from `CityContext.tsx:31-49` querying `venues.region`. NULLs are dropped before display.

**Anomalies to fix in data:**
- NY has 27 venues tagged `region = "New York"` — would render as a chip labelled "New York" inside the New York city view. Should be Manhattan (or another borough).
- `Ridgewood` is geographically in Queens; the rest of the borough is missing entirely. Either standardize on boroughs or accept neighborhood-level granularity for all of NY.
- **Burlington has 5 active venues in the DB but the FE only surfaces Boston and NY.** Either remove these rows / mark inactive, or extend the city list. They're invisible today.
- 7 venues missing `region` won't appear in any region-filtered query.

---

## E. Time-of-day filter

| Query | Result |
|---|---|
| Upcoming events with NULL `start_time` | **1,460** |
| Upcoming events with malformed `start_time` | N/A — column is `time without time zone`; Postgres enforces format. NULL is the only failure mode. |

**Frontend behavior:** `useEvents.ts` parses `start_time` "HH:MM" → hour bucket. NULL silently drops the event from any morning/afternoon/evening filter.

**Pipeline fix:** 1,460 / ~5,617 ≈ **26%** of upcoming events have no `start_time`. Either backfill from source pages or accept that time-of-day filtering excludes a quarter of inventory.

---

## F. Price

Distribution of upcoming events (5,617 total):

| Bucket | Count | Share |
|---|---:|---:|
| `price_amount = 0` (free, FE catches this) | 567 | 10.1% |
| `price_amount > 0` (paid, with amount) | 576 | 10.3% |
| `price` string present but `price_amount` NULL | **721** | 12.8% |
| Both `price` and `price_amount` NULL | **3,753** | **66.8%** |

**Frontend behavior:** "Free" filter requires `price_amount = 0`. "Paid" requires `price_amount > 0` or a non-null `price`. `maxPrice` requires `price_amount`.

**Implications:**
- 66.8% of upcoming events have no price info → invisible to both Free and Paid filters when either is enabled.
- The 721 "only price string" rows (e.g. raw text like "$25" or "Free admission") never get parsed into `price_amount`, so the slider can't bucket them.
- Most likely fix: a parser step that pulls a numeric `price_amount` from the scraped `price` string when possible, and sets `price_amount = 0` for any row whose source clearly says "free".

---

## G. Map / geo

| Query | Result |
|---|---|
| Active venues missing `latitude` or `longitude` | 13 (Burlington 5, NY 4, Boston 4) |
| Active venues with invalid coordinates (out of range, or 0/0) | 0 ✅ |

**Frontend behavior:** map plots venues with valid coords; missing coords silently drop the venue.

**Pipeline fix:** geocode the 8 Boston/NY venues. The 5 Burlington ones are moot if Burlington isn't a supported city anyway (see D).

---

## H. Referential integrity

| Query | Result |
|---|---|
| Upcoming events pointing to a missing or inactive venue | 0 ✅ |
| `event_community_assignments` pointing to a missing community | 0 ✅ |
| `event_community_assignments` pointing to a missing event | 0 ✅ |

Joins are clean.

---

## I. Per-city scorecard

| City | total rows | upcoming | past in gold | soft-deleted | upcoming with image | upcoming with start_time | distinct venues |
|---|---:|---:|---:|---:|---:|---:|---:|
| New York | 4,742 | 4,652 | 90 | 1,649 | 3,791 (81.5%) | 3,356 (72.1%) | 118 |
| Boston | 996 | 965 | 31 | 379 | 878 (91.0%) | 801 (83.0%) | 48 |

**Reading the columns:**
- "upcoming" already excludes past rows. It does *not* exclude soft-deleted — to get the true visible Discover count, subtract `soft_deleted` from `upcoming`.
- Effective Discover supply per city (after `is_deleted` and image fallback work): NY ≈ 4,652 − 1,648 = **3,004 viable**; Boston ≈ 965 − 378 = **587 viable**.
- Image coverage looks high here because it includes the 739 "rescued by venue image" cases.

---

## Suggested priority for the data pipeline

1. **Add `.eq('is_deleted', false)` upstream of Discover** (or physically remove deleted rows) — single highest-impact fix; immediately removes 2k zombie rows.
2. **Promote past events out of `events_gold`** (gold→old job, daily) — fixes the leaked-past-events case end-to-end.
3. **Establish a slug-based category taxonomy** that the FE can match without a code change. Decide which of the 12 chips to keep and add `communities.slug` rows accordingly.
4. **Backfill `start_time`** — 26% NULL rate is the bottleneck for the time-of-day filter.
5. **Parse `price` → `price_amount`** for the 721 rows with text-only price; default true freebies to 0.
6. **Backfill `image_url`** for the 209 upcoming events with no usable image; ensure venue images are present for the rest (the FE web fallback is broken).
7. **Decide on Burlington** — drop the rows or extend the FE to support a third city.
8. **Normalize NY `region` = "New York"** (27 venues) into Manhattan / borough names.
9. **Normalize or drop `status`** — currently 64 free-form values, not usable as a filter.

---

*Generated by querying production data live; no writes were made.*
