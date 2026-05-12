# FindLocal Frontend — Developer Documentation

**Last Updated:** 2026-05-11
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
2. **CityContext** — `selectedCity`, `availableCities`, `selectedRegions`, `availableRegions`. Default city = Boston. City persists to AsyncStorage via `STORAGE_KEYS.PREFERRED_CITY`. Switching city clears `selectedRegions`.
3. **FavoritesContext** — `favoriteEventIds`, `isFavorite(id)`, `toggleFavorite(id)`. Local-only. Persisted to AsyncStorage as a JSON array.
4. **FiltersContext** — `filters`, `setFilters`. Persisted to AsyncStorage.

### React Query (`src/hooks/queries/`)
- `useEventsQuery(city)` → `events_gold` for the city
- `useVenuesQuery(city)` → venues in the city
- `useCommunitiesQuery(city)` → category taxonomy
- `useCityData()` → composes city availability

### Filter logic (`src/hooks/useEvents.ts`)
`filterEvents(events, filters)` filters by:
- `when`: `anytime` (no date filter) / `today` / `tomorrow` / `this_weekend` / `custom`
- `categories[]`: matches `event.event_type` OR `event_community_assignments.community_id`
- `regions[]`: matches `event.region`
- `free` / `paid`: based on `price_amount`
- `maxPrice`: optional cap
- `timeOfDay[]`: parses `start_time` "HH:MM" into morning (5–12) / afternoon (12–17) / evening (17–5)

**Important:** `when='anytime'` does *not* filter past events out. See Known Issues #1.

---

## Component map (`src/components/`)

- **`Header.tsx`** — sticky top bar.
  - Desktop: logo + nav links (`Discover`, `Map`, `Venues`, `About`) + bookmark icon.
  - Mobile: `MapToggleButton` (on `/`) or back arrow (elsewhere) + centered logo + bookmark icon.
  - Reads `useLocalSearchParams<{view?:string}>()` for the toggle state. **Note:** the param read is currently buggy — see Known Issues #6.
- **`MapToggleButton.tsx`** — toggles `?view=map` ↔ `?view=list`. Label is `'List'` when on map, `'Map'` when on list (in theory — see #6).
- **`FilterFAB.tsx`** — fixed bottom-right floating button (mobile only). Badge shows `countActiveFilters(filters)`. Tap → `/filters`.
- **`FilterSidebar.tsx`** — desktop left rail rendering `FilterControls` inline. No count badge here today.
- **`FilterScreen.tsx`** — body of `/filters` modal. Apply button shows match count, calls `router.back()`.
- **`FilterControls.tsx`** — chip groups for City / When / What / Where / Price / Time of Day.
- **`EventFeed.tsx`** — orchestrator. List view: `FlatList` + (desktop) `FilterSidebar` or (mobile) `FilterFAB`. Map view: `FilterSidebar` (desktop) + `EventMap`.
- **`EventCard.tsx`** — 16:9 image, price pill (top-right), date/time, title (2 lines), venue · region (1 line).
- **`EventMap.tsx` + `CustomMapMarker.tsx`** — Google Maps via `@teovilla/react-native-web-maps`. Markers per venue with event count. Callout shows event title, venue, "See Event" button.
  - "See Venue" button exists in `CustomMapMarker.tsx` but is currently dead code — `EventFeed.tsx` does not pass `onVenuePress`.
- **`EventPageSchema.tsx`, `BreadcrumbSchema.tsx`, `StructuredData.tsx`** — JSON-LD for SEO. `EventPageSchema` also sets `document.title` (per-event titles work; static pages share `"Find Local"`).
- **`ui/`** — `Text`, `Icon`, `Logo`, etc. Shared primitives.

---

## API layer (`src/api/`)

`events.ts`, `venues.ts`, `communities.ts` — thin Supabase wrappers. Notable behaviors:
- `getEvents(city, region)`: paginated 1000-rows-per-page, ordered by `event_date ASC`. **Does not** filter past dates.
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

These reflect the state as of 2026-05-11 (recorded during a full Playwright QA pass — see `/Users/elliotharris/.claude/plans/please-use-playwright-mcp-synchronous-lecun.md` for the full report).

1. **Discover shows past events.** `when='anytime'` plus `event_date ASC` means yesterday's events sit at the top of `/`. Fix is in `useEvents.ts` (filter `eventDate >= startOfDay(today)` for `anytime`).
2. **Event hero image dominates viewport.** `event/[id].tsx:200` is `aspectRatio: 16/9` with full width. At 1440px desktop that's 810px tall. Needs a `maxHeight`.
3. **"See Venue" button never appears on map callouts.** `EventFeed.tsx:69` doesn't pass `onVenuePress` to `<EventMap>`. The conditional render in `CustomMapMarker.tsx:282` therefore always evaluates false.
4. **`/filters` Apply errors when deep-linked.** `FilterScreen` calls `router.back()` — if there's no history, you get `'GO_BACK' was not handled by any navigator`. Should fallback to `router.replace('/')`.
5. **Saved page silently filters by selected city.** `saved.tsx:30-33` intersects `favoriteEventIds` with `useEventsQuery(selectedCity)`. Cross-city saves disappear. Either drop the city filter or surface "X saved in other cities".
6. **Mobile map↔list toggle doesn't update from URL.** `Header.tsx:21,24` reads `useLocalSearchParams<{view?:string}>()` but the value doesn't reflect `?view=map`. Result: button stays labeled "Map" while on the map page, and tapping it re-sets `view=map` instead of toggling. Try `usePathname() + useSearchParams()` or pull from `useGlobalSearchParams`.
7. **Hero `require('../../../assets/record.png')` fallback doesn't render on web.** No image and no venue.image → blank 16:9 area. Use a URL-based placeholder or an `<Image source={...}>` that resolves under Metro for web.
8. **`isExpired` is table-membership, not date-comparison.** A past-date event still in `events_gold` shows no "expired" banner and still shows "Buy tickets". Either backfill `old_events` more aggressively or also check `event.event_date < today` on the client.
9. **No filter count badge on desktop sidebar.** Mobile modal has it; desktop is silent.
10. **Document title sticks across SPA navigation.** Only `EventPageSchema` sets `<title>`; nothing resets it. Other pages all read `Find Local` after a hard load, but after visiting an event the title persists. Fix by also updating title on layout/route mount.
11. **Static legal text describes features that don't exist** (accounts, friend invites, contact-list import in Privacy; "follow the gram", beta-tester form in About). Coordinate with whoever maintains those pages.
12. **Console deprecation noise:** `shadow*` style props and `props.pointerEvents` warnings from RNW. Cosmetic but worth a cleanup pass.

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
