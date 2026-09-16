// Embeddable widget contract (pure, unit-tested). public/widget.js mirrors
// buildEmbedSrc so a `<script data-*>` tag and this module always agree on the
// iframe URL. Region groups come from @findlocal/shared/regions.
//
// Two layers of query keys share one URL:
//   * embed-level (the partner's `data-*` attributes): region, city, cat, when,
//     view, theme, limit, partner, authors, filters, near, radius_km, from, to
//   * visitor-level (the in-widget filter toolbar, EMBED_UI_KEYS): q, when,
//     from, to, free, paid, tod, ucat, authors, near, radius_km, place
// `cat` is the partner's PIN (it hides the category chips); `ucat` is the
// visitor's chip choice and is ignored while a pin is in force. Everything the
// toolbar writes goes back into the iframe URL (history.replaceState), so a
// filtered widget can be deep-linked.
import {
  CATEGORY_SLUGS, addDays, cityBySlug, dateRangeFor, getCity, isYmd, nearestCity, parseFilters, regionGroupBySlug, SITE,
  NEAR_DEFAULT_RADIUS_KM, NEAR_MAX_RADIUS_KM, NEAR_PRECISION, TIME_OF_DAY, timeOfDayBucket, todayIn,
  type City, type EventFilters, type NearFilter, type RegionGroup, type TimeOfDay,
} from '@findlocal/shared';

export type EmbedView = 'list' | 'calendar' | 'map';
export type EmbedTheme = 'light' | 'dark' | 'auto';
export const EMBED_VIEWS: EmbedView[] = ['list', 'calendar', 'map'];
export const EMBED_THEMES: EmbedTheme[] = ['light', 'dark', 'auto'];
export const EMBED_DEFAULT_LIMIT = 100;
export const EMBED_MAX_LIMIT = 300;

/** Attributes a partner may set on the script tag (data-widget, data-region, ...). */
export interface EmbedAttrs {
  widget?: string;
  region?: string;
  city?: string;
  cat?: string;
  when?: string;
  view?: string;
  theme?: string;
  limit?: string;
  partner?: string;
  /** '1' = only events with a known author on the bill. */
  authors?: string;
  /** 'off' hides the in-widget filter toolbar (default on). */
  filters?: string;
  /** '<lat>,<lng>': open on a proximity search instead of the region/city scope. */
  near?: string;
  /** Radius in km for `near` (default 25, max 200) — the URL key is radius_km. */
  radius?: string;
  /** '1' = free events only. */
  free?: string;
}

/** Named presets; `data-widget="literary-new-england"` expands to region + cat. */
export const WIDGET_PRESETS: Record<string, { region?: string; city?: string; cat?: string; authors?: string }> = {
  'literary-new-england': { region: 'new-england', cat: 'literary' },
  'literary-new-england-authors': { region: 'new-england', cat: 'literary', authors: '1' },
  'new-england': { region: 'new-england' },
};

const KEYS: (keyof EmbedAttrs)[] = [
  'region', 'city', 'cat', 'when', 'view', 'theme', 'limit', 'partner', 'authors', 'filters', 'near', 'radius', 'free',
];

/** `data-*` attributes whose URL key differs from the attribute name. */
const ATTR_KEY: Partial<Record<keyof EmbedAttrs, string>> = { radius: 'radius_km' };

/** Iframe URL for a set of attributes: preset expanded, explicit attrs win,
 * defaults dropped, keys sorted. KEEP IN SYNC WITH public/widget.js. */
export function buildEmbedSrc(origin: string, attrs: EmbedAttrs): string {
  const merged: Record<string, string> = {};
  const preset = attrs.widget ? WIDGET_PRESETS[attrs.widget.trim().toLowerCase()] : undefined;
  if (preset) Object.assign(merged, preset);
  for (const k of KEYS) {
    const v = attrs[k]?.trim();
    if (v) merged[ATTR_KEY[k] ?? k] = v;
  }
  if (merged.region) delete merged.city;
  if (merged.view === 'list' || (merged.view && !EMBED_VIEWS.includes(merged.view as EmbedView))) delete merged.view;
  if (merged.theme === 'auto' || (merged.theme && !EMBED_THEMES.includes(merged.theme as EmbedTheme))) delete merged.theme;
  if (merged.when === 'anytime') delete merged.when;
  if (merged.authors !== undefined && merged.authors !== '1') delete merged.authors;
  if (merged.free !== undefined && merged.free !== '1') delete merged.free;
  // `filters` is on by default, so only the opt-out is ever written.
  merged.filters = filtersOff(merged.filters) ? '0' : '';
  if (!merged.filters) delete merged.filters;
  // A `near` point replaces the region/city scope; a radius without one is noise.
  if (merged.near !== undefined && !parseNear(merged.near)) delete merged.near;
  if (merged.near === undefined) delete merged.radius_km;
  else merged.near = nearPoint(parseNear(merged.near)!);
  if (merged.radius_km !== undefined) {
    const km = normRadiusKm(merged.radius_km);
    if (km === null || km === NEAR_DEFAULT_RADIUS_KM) delete merged.radius_km;
    else merged.radius_km = String(km);
  }
  if (merged.limit !== undefined) {
    const n = Number.parseInt(merged.limit, 10);
    if (!Number.isInteger(n) || n < 1 || n === EMBED_DEFAULT_LIMIT) delete merged.limit;
    else merged.limit = String(Math.min(n, EMBED_MAX_LIMIT));
  }
  const p = new URLSearchParams(merged);
  p.sort();
  const q = p.toString();
  return `${origin.replace(/\/$/, '')}/embed/events${q ? `?${q}` : ''}`;
}

/** `filters=off|0|false|no` (or data-filters="off") — anything else keeps the toolbar. */
export function filtersOff(raw: string | null | undefined): boolean {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'off' || v === '0' || v === 'false' || v === 'no';
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** '<lat>,<lng>' -> a rounded point (NEAR_PRECISION, as parseFilters rounds it), or null. */
export function parseNear(raw: string | null | undefined): { lat: number; lng: number } | null {
  const parts = (raw ?? '').split(',');
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: round(lat, NEAR_PRECISION), lng: round(lng, NEAR_PRECISION) };
}

/** The `near=` value for a point, exactly as parseFilters/canonicalQuery write it. */
export function nearPoint(p: { lat: number; lng: number }): string {
  return `${p.lat},${p.lng}`;
}

function normRadiusKm(raw: string | null | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return round(Math.min(n, NEAR_MAX_RADIUS_KM), 2);
}

// --------------------------------------------------------------- filter toolbar
//
// The toolbar's whole state lives in the iframe query string, so re-rendering in
// place (fetch /api/embed/events + history.replaceState) and a plain no-JS form
// submit produce the identical view.

/** `when` buckets the toolbar offers. `month` is ours: the next 30 days. */
export const EMBED_WHENS = ['anytime', 'today', 'tomorrow', 'weekend', 'week', 'month'] as const;
export type EmbedWhen = (typeof EMBED_WHENS)[number];
export const EMBED_MONTH_DAYS = 30;
/** Radii the "Near" control offers (km); the contract still accepts any 1..200. */
export const EMBED_RADII_KM = [5, 10, 25, 50] as const;

export type EmbedPrice = 'any' | 'free' | 'paid';

/** Every key the toolbar owns — cleared before the new state is written.
 * `price` is the no-JS form's alias for free/paid and is never written back. */
export const EMBED_UI_KEYS = [
  'q', 'when', 'from', 'to', 'free', 'paid', 'price', 'tod', 'ucat', 'authors', 'near', 'radius_km', 'place',
] as const;

export interface EmbedUiState {
  /** Free-text search (title / venue / performer). */
  q: string;
  when: EmbedWhen;
  /** Explicit range; wins over `when` when `from` is set. */
  from?: string;
  to?: string;
  price: EmbedPrice;
  tod: TimeOfDay[];
  /** Visitor-chosen categories (`ucat`); empty when the partner pinned `cat`. */
  cats: string[];
  authorsOnly: boolean;
  near?: NearFilter;
  /** Human label for the `near` point ("Somerville, MA" / "Your location"). */
  place?: string;
}

function normPlace(raw: string | null): string | undefined {
  const s = (raw ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return s || undefined;
}

function normCats(raw: string | null): string[] {
  const set = new Set((raw ?? '').split(',').map((s) => s.trim().toLowerCase()));
  return CATEGORY_SLUGS.filter((s) => set.has(s));
}

/** `near=lat,lng` + `radius_km`, with the same clamping parseFilters applies. */
export function readNear(params: URLSearchParams): NearFilter | undefined {
  const p = parseNear(params.get('near'));
  if (!p) return undefined;
  return { ...p, radiusKm: normRadiusKm(params.get('radius_km')) ?? NEAR_DEFAULT_RADIUS_KM };
}

/** Toolbar state from a query string (defaults when a key is absent/invalid).
 * `price=free|paid` is the no-JS form's spelling of `free=1` / `paid=1` (a radio
 * group cannot submit two different keys); the canonical URL keeps free/paid. */
export function readUiState(params: URLSearchParams): EmbedUiState {
  const whenRaw = (params.get('when') ?? '').trim().toLowerCase();
  const when = (EMBED_WHENS as readonly string[]).includes(whenRaw) ? (whenRaw as EmbedWhen) : 'anytime';
  const alias = (params.get('price') ?? '').trim().toLowerCase();
  const free = params.get('free') === '1' || alias === 'free';
  const paid = params.get('paid') === '1' || alias === 'paid';
  const state: EmbedUiState = {
    q: (params.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
    when,
    price: free && !paid ? 'free' : paid && !free ? 'paid' : 'any',
    tod: TIME_OF_DAY.filter((t) => params.getAll('tod').join(',').split(',').map((s) => s.trim().toLowerCase()).includes(t)),
    cats: normCats(params.getAll('ucat').join(',')),
    authorsOnly: params.get('authors') === '1',
  };
  const from = params.get('from');
  const to = params.get('to');
  if (isYmd(from)) state.from = from;
  if (isYmd(to)) state.to = to;
  const near = readNear(params);
  if (near) state.near = near;
  const place = normPlace(params.get('place'));
  if (place) state.place = place;
  return state;
}

/** true when the visitor has narrowed anything (drives the "Clear" button). */
export function uiStateIsEmpty(s: EmbedUiState): boolean {
  return !s.q && s.when === 'anytime' && !s.from && !s.to && s.price === 'any'
    && s.tod.length === 0 && s.cats.length === 0 && !s.authorsOnly && !s.near;
}

/**
 * `base` (the iframe's current query: the partner's embed-level keys) with the
 * toolbar keys replaced by `state`. Sorted, defaults dropped — the same shape
 * the server-rendered URL has, so it is also a stable edge-cache key.
 */
export function uiQuery(base: URLSearchParams, state: EmbedUiState): string {
  const p = new URLSearchParams(base);
  for (const k of EMBED_UI_KEYS) p.delete(k);
  if (state.q) p.set('q', state.q);
  if (state.when !== 'anytime') p.set('when', state.when);
  if (state.from) p.set('from', state.from);
  if (state.to) p.set('to', state.to);
  if (state.price === 'free') p.set('free', '1');
  if (state.price === 'paid') p.set('paid', '1');
  if (state.tod.length) p.set('tod', TIME_OF_DAY.filter((t) => state.tod.includes(t)).join(','));
  if (state.cats.length) p.set('ucat', normCats(state.cats.join(',')).join(','));
  if (state.authorsOnly) p.set('authors', '1');
  if (state.near) {
    p.set('near', nearPoint(state.near));
    if (state.near.radiusKm !== NEAR_DEFAULT_RADIUS_KM) p.set('radius_km', String(state.near.radiusKm));
    if (state.place) p.set('place', state.place);
  }
  p.sort();
  return p.toString();
}

/** Inclusive day range for a toolbar `when`, resolved in `tz`. `month` = the next 30 days. */
export function embedWhenRange(when: string, tz: string, now: Date = new Date()): { from: string; to: string | null } {
  const w = (when ?? '').trim().toLowerCase();
  if (w === 'month') {
    const today = todayIn(tz, now);
    return { from: today, to: addDays(today, EMBED_MONTH_DAYS - 1) };
  }
  return dateRangeFor(w || 'anytime', tz, now);
}

export interface EmbedParams {
  group?: RegionGroup;
  city?: City;
  view: EmbedView;
  theme: EmbedTheme;
  limit: number;
  /** `from`/`to` when explicit YYYY-MM-DD params were given. */
  from?: string;
  to?: string | null;
  partner?: string;
  /** Copy of the request params without the embed-only keys, safe for parseFilters. */
  filterParams: URLSearchParams;
  /** Effective category slugs: the partner's `cat` pin, else the visitor's `ucat`. */
  categories: string[];
  /** true when `cat` pinned the widget: the category chips are hidden. */
  pinnedCategories: boolean;
  /** `authors=1`: only events with a known author on the bill. */
  authorsOnly: boolean;
  /** false with `filters=0|off`: no toolbar, exactly the pre-B5 widget. */
  filtersOn: boolean;
  /** Proximity search; it REPLACES the region/city scope (nearest metro + distance order). */
  near?: NearFilter;
  /** Everything the toolbar renders (also derived from the query). */
  ui: EmbedUiState;
  error?: 'unknown-region' | 'unknown-city' | 'unknown-category';
  /** utm_campaign value: preset name, or region/city + category. */
  campaign: string;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  const v = (raw ?? '').trim().toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

/** Server-side parse of the /embed/events query contract. */
export function parseEmbedParams(params: URLSearchParams): EmbedParams {
  const filterParams = new URLSearchParams(params);
  for (const k of ['region', 'city', 'view', 'theme', 'limit', 'partner', 'from', 'to', 'filters', 'place', 'ucat', 'price']) {
    filterParams.delete(k);
  }
  const view = pick(params.get('view'), EMBED_VIEWS, 'list');
  const theme = pick(params.get('theme'), EMBED_THEMES, 'auto');
  const n = Number.parseInt(params.get('limit') ?? '', 10);
  const limit = Number.isInteger(n) && n > 0 ? Math.min(n, EMBED_MAX_LIMIT) : EMBED_DEFAULT_LIMIT;
  const partner = (params.get('partner') ?? '').trim().replace(/[^\w.-]/g, '').slice(0, 40) || undefined;
  const catRaw = (params.get('cat') ?? '').trim();
  const pinned = normCats(catRaw);
  const ui = readUiState(params);
  // The pin wins; without one the visitor's chips are the effective categories.
  const cats = pinned.length ? pinned : ui.cats;
  if (cats.length) filterParams.set('cat', cats.join(','));
  // Normalise what parseFilters reads: one `tod`/`free`/`paid` spelling, whether
  // it arrived as repeated params or the form's `price` radio.
  filterParams.delete('free');
  filterParams.delete('paid');
  if (ui.price !== 'any') filterParams.set(ui.price, '1');
  if (ui.tod.length) filterParams.set('tod', ui.tod.join(','));
  const authorsOnly = ui.authorsOnly;
  const out: EmbedParams = {
    view, theme, limit, filterParams, categories: cats, pinnedCategories: pinned.length > 0,
    authorsOnly, filtersOn: !filtersOff(params.get('filters')), ui, campaign: '',
  };
  if (partner) out.partner = partner;
  if (ui.near) out.near = ui.near;
  const fromRaw = params.get('from');
  const toRaw = params.get('to');
  if (isYmd(fromRaw)) out.from = fromRaw;
  if (isYmd(toRaw)) out.to = toRaw;

  const regionRaw = params.get('region');
  const cityRaw = params.get('city');
  if (regionRaw) {
    const group = regionGroupBySlug(regionRaw);
    if (group) out.group = group;
    else out.error = 'unknown-region';
  } else if (cityRaw) {
    const city = cityBySlug(cityRaw) ?? getCity(cityRaw);
    if (city) out.city = city;
    else out.error = 'unknown-city';
  } else {
    out.city = getCity('Boston');
  }
  // A typo'd category must not silently widen the widget to every category.
  if (!out.error && catRaw && !pinned.length) out.error = 'unknown-category';
  const scope = out.group?.slug ?? out.city?.slug ?? 'unknown';
  out.campaign = (pinned.length ? `${scope}-${pinned.join('-')}` : scope) + (authorsOnly ? '-authors' : '');
  return out;
}

/** The same embed URL with `authors=1` switched on or off (keys kept sorted). */
export function toggleAuthorsHref(url: URL, on: boolean): string {
  const p = new URLSearchParams(url.search);
  if (on) p.set('authors', '1');
  else p.delete('authors');
  p.sort();
  const q = p.toString();
  return `${url.pathname}${q ? `?${q}` : ''}`;
}

/** Filters for a single-city embed (the site's contract, plus `when=month` and
 * the explicit from/to override). `near` comes through parseFilters. */
export function embedCityFilters(p: EmbedParams, city: City, now: Date = new Date()): EventFilters {
  const f = parseFilters(p.filterParams, city, now);
  if (p.ui.when === 'month') {
    const r = embedWhenRange('month', city.tz, now);
    f.from = r.from;
    f.to = r.to;
  }
  if (p.from) f.from = p.from;
  if (p.to !== undefined) f.to = p.to;
  f.limit = p.limit + 1;
  f.offset = 0;
  return f;
}

/** Date window for a region-group embed: explicit from/to, else `when` in the group tz. */
export function embedGroupRange(p: EmbedParams, group: RegionGroup, now: Date = new Date()): { from: string; to: string | null } {
  const when = (p.filterParams.get('when') ?? 'anytime').trim().toLowerCase();
  const range = embedWhenRange(when || 'anytime', group.tz, now);
  return { from: p.from ?? range.from, to: p.to !== undefined ? p.to : range.to };
}

/**
 * Scope to query. A `near` point REPLACES the partner's region/city scope: the
 * events table is city-partitioned, so a proximity search runs against the
 * nearest supported metro (the bounding box then does the real narrowing) —
 * that is what "near beats scope" means for a widget.
 */
export function embedScope(p: EmbedParams): { kind: 'city'; city: City } | { kind: 'group'; group: RegionGroup } | null {
  if (p.near) return { kind: 'city', city: nearestCity(p.near.lat, p.near.lng) };
  if (p.group) return { kind: 'group', group: p.group };
  if (p.city) return { kind: 'city', city: p.city };
  return null;
}

/**
 * Filters the multi-city query cannot express (it takes cities/categories/dates/
 * authors only), applied in JS over the rows it returned. Mirrors the SQL in
 * queries.ts::buildWhere — free/paid on price_amount then the price text,
 * time-of-day on the start hour, text over title/venue/performer names.
 */
export function matchesEmbedFilters(e: EmbedFilterable, f: EventFilters): boolean {
  const priceText = (e.price ?? '').toLowerCase();
  const isFree = e.price_amount === 0 || priceText.includes('free');
  const isPaid = (e.price_amount ?? 0) > 0
    || (e.price_amount == null && priceText !== '' && !priceText.includes('free'));
  if (f.free && f.paid) {
    if (!isFree && !isPaid) return false;
  } else if (f.free && !isFree) return false;
  else if (f.paid && !isPaid) return false;
  if (f.maxPrice !== undefined && !(e.price_amount != null && e.price_amount <= f.maxPrice)) return false;
  if (f.timeOfDay?.length) {
    const bucket = timeOfDayBucket(e.start_time);
    if (!bucket || !f.timeOfDay.includes(bucket)) return false;
  }
  if (f.text) {
    const needle = f.text.trim().toLowerCase();
    const haystack = [e.title, e.venue_name, ...(e.performers ?? []).map((p) => p.name)];
    if (!haystack.some((s) => (s ?? '').toLowerCase().includes(needle))) return false;
  }
  return true;
}

/** The fields matchesEmbedFilters reads (an EventRow satisfies it). */
export interface EmbedFilterable {
  title: string;
  venue_name: string;
  start_time: string | null;
  price: string | null;
  price_amount: number | null;
  performers?: { name: string }[];
}

function utm(campaign: string, partner?: string): string {
  const p = new URLSearchParams({ utm_source: 'widget', utm_medium: 'embed', utm_campaign: campaign });
  if (partner) p.set('utm_content', partner);
  return p.toString();
}

export function eventUrl(id: string, campaign: string, partner?: string): string {
  return `${SITE}/event/${id}?${utm(campaign, partner)}`;
}
export function venueUrl(id: string, campaign: string, partner?: string): string {
  return `${SITE}/venue/${id}?${utm(campaign, partner)}`;
}
export function siteUrl(path: string, campaign: string, partner?: string): string {
  return `${SITE}${path}?${utm(campaign, partner)}`;
}
