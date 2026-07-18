# FindLocal Frontend — Developer Documentation

**Last Updated:** 2026-07-18
**React Native:** 0.81.5 · **Expo SDK:** 54 · **Expo Router:** ~6
**Target platforms:** iOS, Android, Web (web is the primary build today)

---

## Project Overview

FindLocal is a cross-platform event discovery app built with React Native + Expo. It surfaces local events across multiple cities (currently Boston and New York) with list and map views, filtering, favorites, and structured-data SEO.

**Current scope (what actually exists):**
- Event discovery (list + map)
- Filtering by date range, category, region, price, time-of-day
- Favorites (saved events) — local-only via AsyncStorage
- Per-city browsing with persistent city selection
- Per-venue page with upcoming events
- Static About / Privacy / Terms pages
- GA4 + Microsoft Clarity analytics (web only)

**Explicitly NOT implemented** (do not assume any of these exist in code — they are referenced in some marketing copy but there is no auth or backend write path):
- User accounts / sign-in / sign-up
- Profile pages
- Friends, RSVPs, invitations
- Event creation by users
- Push notifications
- Native mobile builds shipped (the app boots on iOS/Android via Expo but the deployed experience is web)

If the user asks for any of those, treat it as a net-new feature, not a bug.

---

## Stack

| Concern | Library |
|---|---|
| UI | React 19 + React Native 0.81 + React Native Web |
| Routing | Expo Router (file-based, `src/app/`) |
| Server state | TanStack React Query |
| Client state | React Context (Theme, City, Favorites, Filters) |
| Persistence | `@react-native-async-storage/async-storage` (works as a web localStorage shim) |
| Backend | Supabase (read-only from the app; tables: `events_gold`, `old_events`, `venues`, `event_community_assignments`) |
| Maps | `react-native-maps` on native, `@teovilla/react-native-web-maps` on web (Google Maps JS API) |
| Icons | Emojis + a small `Icon` component (no third-party icon library calls) |
| Fonts | `@expo-google-fonts/epilogue`, `@expo-google-fonts/manrope` |
| Date | `date-fns` |

---

## Routes (file-based, `src/app/`)

| File | Path | Purpose |
|---|---|---|
| `index.tsx` | `/` | Discover (list view). Reads `?view=map` to switch to map. |
| `map.tsx` | `/map` | Redirects to `/?view=map`. |
| `event/[id].tsx` | `/event/:id` | Event detail. Hero, date, venue link, share/calendar/save, ticket button. Falls back to `old_events` table if not in `events_gold` (sets `isExpired=true`). |
| `venue/[id].tsx` | `/venue/:id` | Venue detail. Hero, metadata, address (opens maps), website pill, upcoming events (max 12, filtered to future dates only). |
| `saved.tsx` | `/saved` | Saved events for the **currently selected city** (yes — switching cities makes saved events from the other city disappear; see Known Issues). |
| `venues.tsx` | `/venues` | Alphabetical list of venues in current city. |
| `filters.tsx` | `/filters` | Filter modal. Opened on mobile by `FilterFAB`. On desktop the same controls live inline as `FilterSidebar`. |
| `about.tsx`, `privacy.tsx`, `terms.tsx` | `/about`, `/privacy`, `/terms` | Static content. |
| `_layout.tsx` | — | Root layout: query client, theme/city/favorites/filters providers, GA4 + Clarity dev injection. |
| `+html.tsx` | — | Static `<head>` shell. |

There is no auth-gated route group, no `(private)`, no `(auth)`.

---

## State

### Contexts (`src/context/`)
1. **ThemeContext** — `theme`, `isDark`, `setThemeMode('system'|'light'|'dark')`. Theme mode is **not** persisted yet (state-only).
2. **CityContext** — `selectedCity`, `allCityData` (cities + regions derived from active `venues` rows), `selectedRegions`, `availableRegions`, plus geolocation: `requestLocation()`, `locationStatus`, `userLocation`, `nearbyCities` (city names sorted nearest-first), and `feedSort` (`'soonest' | 'nearest'`, session-only). A granted `requestLocation()` auto-selects the nearest city that has coordinate data in `cities.ts` (once per tap — it doesn't fight later manual picks) and flips `feedSort` to `'nearest'`. Default city = Boston. City persists to AsyncStorage via `STORAGE_KEYS.PREFERRED_CITY`. Switching city clears `selectedRegions`.
   - `src/constants/cities.ts` is the canonical launch-city list (~31 cities) with lat/lng + state. It drives the "Nearby" sort, chip labels ("Boston, MA"), and map centering. Keep names in sync with `venues.city` values.
3. **FavoritesContext** — `favoriteEventIds`, `isFavorite(id)`, `toggleFavorite(id)`. Local-only. Persisted to AsyncStorage as a JSON array.
4. **FiltersContext** — `filters`, `setFilters`. Persisted to AsyncStorage — except `query` (free-text search), which is session-only so a forgotten search never empties the feed on the next visit.

### React Query (`src/hooks/queries/`)
- `useEventsQuery(city)` → `events_gold` for the city
- `useVenuesQuery(city)` → venues in the city
- `useCommunitiesQuery(city)` → category taxonomy
- `useCityData()` → composes city availability

### Filter logic (`src/hooks/useEvents.ts`)
`filterEvents(events, filters, venueNames?)` filters by:
- `query`: case-insensitive substring over title + venue name (via the optional `venue_id → name` map) + `custom_location`
- `when`: `anytime` (no date filter) / `today` / `tomorrow` / `this_weekend` / `custom`
- `categories[]`: matches `event.event_type` OR `event_community_assignments.community_id`
- `regions[]`: matches `event.region`
- `free` / `paid`: based on `price_amount`
- `maxPrice`: optional cap
- `timeOfDay[]`: parses `start_time` "HH:MM" into morning (5–12) / afternoon (12–17) / evening (17–5)

`when='anytime'` filters to `eventDate >= startOfDay(today)`, so past events never render even though the API can return them.

**Recurrence** (`src/hooks/../utils/recurrence.ts`): a "recurring event" is the same normalized title at the same venue on >1 distinct date. `EventFeed` builds the map from the unfiltered city feed and passes `isRecurring` to `EventCard` (↻ pill, top-left of image). The detail page queries `getUpcomingSeriesDates(venueId, title)` and shows "Recurring event · N upcoming dates".

---

## Component map (`src/components/`)

- **`Header.tsx`** — sticky top bar.
  - Desktop: logo + event search bar (filters the Discover feed via `filters.query`; Enter navigates to `/` from other pages) + nav links (`Discover`, `Map`, `Venues`, `About`) + bookmark icon.
  - Mobile: `MapToggleButton` (on `/`) or back arrow (elsewhere) + centered logo + bookmark icon. No header search — mobile search lives at the top of the `/filters` modal.
  - Uses `useGlobalSearchParams` for the toggle state (works correctly).
- **`MapToggleButton.tsx`** — toggles `?view=map` ↔ `?view=list`. Label is `'List'` when on map, `'Map'` when on list.
- **`FilterFAB.tsx`** — fixed bottom-right floating button (mobile only). Badge shows `countActiveFilters(filters)`. Tap → `/filters`.
- **`FilterSidebar.tsx`** — desktop left rail rendering `FilterControls` inline. Shows "Reset · N" when filters are active.
- **`FilterScreen.tsx`** — body of `/filters` modal. Apply button shows match count, calls `router.back()`.
- **`FilterControls.tsx`** — chip groups for When / What / Where / Price / Time of Day, plus the City section (a `CityDropdown`) and, on mobile, the event search box. Chips are **availability-aware**: an option only renders if selecting it (as the sole choice in its group, with every other group's filters applied) would match ≥1 event in the current city; active chips always stay visible so they can be unselected, and whole sections hide when empty. Regions are derived from the events themselves, not the venue table.
- **`CityDropdown.tsx`** — searchable dropdown for city selection (trigger + modal list, always alphabetical). "Use my location" hands off to `CityContext.requestLocation()`, which selects the nearest city and flips the feed to distance sort — location never reorders the city list itself.
- **`EventFeed.tsx`** — orchestrator. List view: `FlatList` + (desktop) `FilterSidebar` or (mobile) `FilterFAB`. Map view: `FilterSidebar` (desktop) + `EventMap`. Once the user shares a location, a "Sort: Soonest / Nearest" toggle appears above the list; Nearest orders by venue distance (ties → date, then start_time; venues without coords sink to the bottom). The API always returns date-ascending — "Soonest" is just that order.
- **`EventCard.tsx`** — 16:9 image, price pill (top-right), date/time, title (2 lines), venue · region · distance-in-miles (1 line; distance only when location is shared and the venue has coords).
- **`EventMap.tsx` + `CustomMapMarker.tsx`** — Google Maps via `@teovilla/react-native-web-maps`. Markers per venue with event count. Callout shows event title, venue, "See Event" and "See Venue" buttons (both wired). Initial center comes from `getCityInfo(selectedCity)` (all launch cities), then web fit-bounds to venue coords. A locate button (top-right) requests/centers on the user's position; web renders a blue-dot marker, native uses `showsUserLocation`.
- **`EventPageSchema.tsx`, `BreadcrumbSchema.tsx`, `StructuredData.tsx`** — JSON-LD for SEO. `EventPageSchema` also sets `document.title` (per-event titles work; static pages share `"Find Local"`).
- **`ui/`** — `Text`, `Icon`, `Logo`, etc. Shared primitives.

---

## SEO / Cloudflare Pages Functions (`functions/`)

The web export is a single-page shell (`dist/index.html`); `_redirects` rewrites unknown paths to it with a 200. That once meant every `/event/*` URL served an identical homepage head — Search Console filed ~7.4k **Soft 404s** (dead events answering 200) and ~1.9k **Duplicate without user-selected canonical**. Fixed 2026-07-18 by Pages Functions, which run before static assets/redirects:

- **`functions/event/[id].ts`** — fetches the event via PostgREST. Live event → 200 with per-event `<title>`, meta description, canonical, OG/Twitter tags, and Event JSON-LD injected into the shell. Past date or `old_events` fallback → **410 + noindex** (shell still renders the friendly page for humans). Unknown id → **404 + noindex**. Supabase outage → plain shell at 200, never a 500.
- **`functions/venue/[id].ts`** — same pattern; unknown/inactive venue → 404.
- **`functions/_shared.ts`** — meta-rewriting helpers (`applyMeta`, `supabaseSelect`, `htmlResponse`); underscore prefix keeps it unrouted.
- **`functions/sitemap.ts`** — dynamic sitemap at `/sitemap` (future events + active venues), referenced by `public/robots.txt`.

Client-side, `_layout.tsx` maintains a per-route canonical (query params stripped, so `/?view=map` folds into `/`) and noindexes `/saved`, `/filters`, `/map`; `EventPageSchema` keeps event meta in sync during client navigation. `public/robots.txt` allows AI/answer-engine crawlers (GEO) — don't re-add the GPTBot/ClaudeBot blocks.

To test functions locally: build them with esbuild to CJS and invoke `onRequest` with a stub `ASSETS` binding plus the `.env` Supabase keys (no wrangler needed).

---

## API layer (`src/api/`)

`events.ts`, `venues.ts`, `communities.ts` — thin Supabase wrappers. Notable behaviors:
- `getEventsWithCommunities(city)` (the feed query): paginated 1000-rows-per-page, `event_date >= today`, ordered ASC, and selects **only the 13 list columns** (no `description`, no community join unless a community/label filter is passed). ~66% payload reduction vs `select('*')+join`.
- Venue list queries select `VENUE_COLUMNS` (no `scraper_config`/`transform_rules` JSONB) — ~92% payload reduction. `getVenueById`/`getVenueByName` still return full rows.
- `getUpcomingSeriesDates(venueId, title)`: distinct future dates for a recurring series (event detail page).
- `getEvents(city, region)`: legacy variant; paginated, ordered ASC, does **not** filter past dates.
- `getEventByIdWithFallback(id)`: tries `events_gold` first, falls back to `old_events`. Returns `{event, isExpired}` where `isExpired` reflects which table it came from — *not* whether `event_date` < today. A "yesterday" event still in `events_gold` is treated as not-expired.
- `getUpcomingEventsForVenue(venueId, limit=3)`: uses `gte('event_date', today)`. This is the only place past-date filtering is currently applied.

There are CRUD functions (`createEvent`, `updateEvent`, `deleteEvent`, `getMyCreatedEvents`) wired to `supabase.auth.getUser()`. **Auth is not implemented in the app, so these are currently unreachable from the UI.** Treat them as scaffolding for a future feature, not as live code paths.

---

## Conventions

### Icons
Use emojis or the shared `Icon` component. No `@expo/vector-icons` direct usage in new code.

### Theme
Always reference theme tokens — `theme.colors`, `theme.spacing`, `theme.typography`. Never hardcode colors. Dark mode is wired but not exposed in the UI (no toggle in the user-facing app today).

### Platform-specific files
Use the standard Expo split when needed:
```
Component.tsx        # shared/default
Component.web.tsx    # web override
Component.native.tsx # iOS/Android override
```
Currently used by `MapView.web.tsx`, `MapView.native.tsx`, `MapComponents.web.ts`, `MapComponents.native.ts`.

### Date / time formatting
- Date on detail page: `format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')`
- Date on card: `EEE · MMM d` (uppercase)
- Time: 12-hour with AM/PM via `formatTime("HH:MM")`

### Error handling
- Use `logger` (`src/utils/logger.ts`) for dev-only logs.
- User-facing errors via `showToast` (`src/utils/toast.ts`).
- API functions throw; callers should catch.

---

## Known Issues & Gotchas

These reflect the state as of 2026-07-02 (full Playwright QA pass + code review). Issues #1, #3–#6, #8–#10 from the 2026-05-11 list are fixed and removed.

1. ~~Event hero image dominates viewport~~ — fixed 2026-07-18: event/venue heroes cap at 320px, letterbox uncropped over a blurred fill, and host the floating back button (top-left).
2. **Static legal text describes features that don't exist** (accounts, friend invites, contact-list import in Privacy). Coordinate with whoever maintains those pages.
3. **Console deprecation noise:** `shadow*` style props and `props.pointerEvents` warnings from RNW. Cosmetic but worth a cleanup pass.
4. **Prod fonts fail to load on findlocal.community.** Every Epilogue/Manrope `.ttf` under `/assets/node_modules/@expo-google-fonts/...` fails OTS parsing (`invalid sfntVersion`) — the deployed font binaries are corrupt (likely mangled by the build/CDN pipeline), so prod silently falls back to system fonts. Check `npm run build` output + hosting config.
5. **`price_amount` is NULL on ~96% of events**, so Free/Paid filters return near-zero results (100% NULL for LA/Minneapolis). Real fix belongs in the FindLocalData gold pipeline; a conservative backfill is sketched in `scripts/data-cleanup.sql`.
6. **Data hygiene backlog** lives in `scripts/data-cleanup.sql` (run manually): discovery_locations test rows/dupes/wrong coords, 'Saint Paul' vs 'St. Paul' region split, "club closed" placeholder events, fee-paragraph text stored in `events_gold.price`, trailing-whitespace venue names. `scripts/venue-backfill.sql` holds researched images/descriptions for ~50 venues (Supabase MCP is read-only; apply via dashboard).
7. **Community joins are scaffolding.** `event_community_assignments` is only fetched when a community/label filter is passed, and no UI passes one; category chips filter on `event_type` tokens only.

---

## Common Commands

```bash
npm run web              # Expo + Metro for web (http://localhost:8081)
npm start                # Expo dev server (interactive picker)
npm run ios              # iOS simulator
npm run android          # Android emulator
npm run build            # Web production build (export + inject head scripts + copy _headers/_redirects)
```

---

## Environment

`.env` at repo root:
```
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

GA4 measurement ID `G-SK3E86M5F8` and Clarity project ID `vkzkf8j9n8` are injected by `scripts/inject-head.js` (prod) or `_layout.tsx` (dev).

---

## When This File Drifts

This doc was previously out-of-sync with the code by a wide margin (described auth, friends, invites, RSVPs, profile pages, bottom tab bar — none of which exist). If you find yourself adding new features or removing whole subsystems, update this file in the same change so the next reader doesn't waste time chasing ghosts.
