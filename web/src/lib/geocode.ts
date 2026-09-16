// Keyless forward geocoding for the widget's "Near" box (zip code, city,
// neighborhood or street address): Photon (Komoot) first, Nominatim as the
// fallback. Both are shared community services, so calls are serialised behind
// a one-per-second gate and the UI debounces typing.
//
// This is the web twin of FindLocalMobile/src/lib/geocode.ts — same providers,
// same US-only rule, same result shape (`geocode(q)` here == `searchPlaces(q)`
// there), so a fix to one is a one-line port to the other. Keep them in sync.
//
// Runs in the browser (inside the embed iframe) and in tests; `opts.fetch` is
// how a test injects a stub. Never throws: a dead geocoder yields [].
import { nearestCity, type City } from '@findlocal/shared';

export interface GeoPlace {
  /** Stable enough for a list key; not persisted. */
  id: string;
  /** Primary line: "Somerville", "02143", "11 Beacon St". */
  label: string;
  /** Secondary line: "Middlesex County, Massachusetts". May be ''. */
  detail: string;
  lat: number;
  lng: number;
  source: 'photon' | 'nominatim';
}

export interface GeocodeOptions {
  limit?: number;
  /** Bias results towards this point (usually the widget's metro centre). */
  near?: { lat: number; lng: number };
  /** Minimum gap between outgoing requests; tests pass 0. */
  minIntervalMs?: number;
  /** Abort an in-flight lookup when the query changed. */
  signal?: AbortSignal;
  /** Injected in tests; defaults to the global fetch. */
  fetch?: typeof fetch;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** Nominatim's usage policy requires an identifying User-Agent with contact info.
 * Browsers forbid setting it (they send their own), so it goes out only off-browser. */
const USER_AGENT = 'FindLocalWeb/1.0 (+https://findlocal.community)';
export const MIN_INTERVAL_MS = 1000;
/** Shorter queries are noise (and a zip code is 5). */
export const MIN_QUERY_LENGTH = 3;
export const DEFAULT_LIMIT = 5;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// One shared gate: requests are serialised and spaced by `minIntervalMs`.
let gate: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function throttled<T>(minIntervalMs: number, run: () => Promise<T>): Promise<T> {
  const prior = gate.catch(() => undefined);
  const task = (async () => {
    await prior;
    const wait = minIntervalMs - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return run();
  })();
  gate = task.catch(() => undefined);
  return task;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (typeof document === 'undefined') h['User-Agent'] = USER_AGENT;
  return h;
}

async function getJsonOrNull(url: string, opts: GeocodeOptions): Promise<unknown> {
  const doFetch = opts.fetch ?? globalThis.fetch;
  try {
    const res = await doFetch(url, { headers: headers(), ...(opts.signal ? { signal: opts.signal } : {}) });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Join the non-empty parts, dropping any that repeat the label. */
function detailLine(parts: (string | undefined)[], label: string): string {
  const seen = new Set<string>([label.toLowerCase()]);
  const out: string[] = [];
  for (const raw of parts) {
    const p = str(raw);
    if (!p || seen.has(p.toLowerCase())) continue;
    seen.add(p.toLowerCase());
    out.push(p);
  }
  return out.join(', ');
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
}

function photonPlace(feature: PhotonFeature, i: number): GeoPlace | null {
  const props = feature.properties ?? {};
  if (str(props.countrycode).toUpperCase() !== 'US') return null;
  const coords = Array.isArray(feature.geometry?.coordinates) ? feature.geometry.coordinates : [];
  const lng = num(coords[0]);
  const lat = num(coords[1]);
  if (lat === null || lng === null) return null;
  const street = [str(props.housenumber), str(props.street)].filter(Boolean).join(' ');
  const label = str(props.name) || street || str(props.postcode);
  if (!label) return null;
  const locality = str(props.city) || str(props.district) || str(props.county);
  return {
    id: `photon:${str(props.osm_type)}${str(props.osm_id) || i}:${i}`,
    label,
    detail: detailLine([street !== label ? street : '', locality, str(props.state), str(props.postcode)], label),
    lat,
    lng,
    source: 'photon',
  };
}

async function searchPhoton(q: string, opts: GeocodeOptions): Promise<GeoPlace[]> {
  const params = new URLSearchParams({ q, limit: String(opts.limit ?? DEFAULT_LIMIT), lang: 'en' });
  if (opts.near) {
    params.set('lat', String(opts.near.lat));
    params.set('lon', String(opts.near.lng));
  }
  const body = await throttled(opts.minIntervalMs ?? MIN_INTERVAL_MS, () =>
    getJsonOrNull(`${PHOTON_URL}?${params.toString()}`, opts),
  );
  const features = (body as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  return features
    .map((f, i) => photonPlace((f ?? {}) as PhotonFeature, i))
    .filter((p): p is GeoPlace => p !== null);
}

function nominatimPlace(row: Record<string, unknown>, i: number): GeoPlace | null {
  const lat = num(row.lat);
  const lng = num(row.lon);
  if (lat === null || lng === null) return null;
  const display = str(row.display_name);
  const segments = display.split(',').map((s) => s.trim()).filter((s) => s && s !== 'United States');
  const label = str(row.name) || segments[0] || display;
  if (!label) return null;
  return {
    id: `nominatim:${str(row.place_id) || i}`,
    label,
    detail: detailLine(segments.slice(-3), label),
    lat,
    lng,
    source: 'nominatim',
  };
}

async function searchNominatim(q: string, opts: GeocodeOptions): Promise<GeoPlace[]> {
  const params = new URLSearchParams({ format: 'jsonv2', countrycodes: 'us', q, limit: String(opts.limit ?? DEFAULT_LIMIT) });
  const body = await throttled(opts.minIntervalMs ?? MIN_INTERVAL_MS, () =>
    getJsonOrNull(`${NOMINATIM_URL}?${params.toString()}`, opts),
  );
  if (!Array.isArray(body)) return [];
  return body
    .map((row, i) => nominatimPlace((row ?? {}) as Record<string, unknown>, i))
    .filter((p): p is GeoPlace => p !== null);
}

/**
 * US places matching `query`, best first. Never rejects: a dead geocoder or an
 * offline visitor yields `[]` so the widget can keep showing its current list.
 * Photon is tried first; Nominatim only runs when Photon fails or has nothing.
 */
export async function geocode(query: string, opts: GeocodeOptions = {}): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const photon = await searchPhoton(q, opts);
  if (photon.length > 0) return photon;
  return searchNominatim(q, opts);
}

/** One line for the "Near" input / the `place` query param. */
export function placeLabel(place: Pick<GeoPlace, 'label' | 'detail'>): string {
  return place.detail ? `${place.label}, ${place.detail}` : place.label;
}

/** The supported metro a chosen point belongs to (the widget's listings scope). */
export function metroFor(place: Pick<GeoPlace, 'lat' | 'lng'>): City {
  return nearestCity(place.lat, place.lng);
}
