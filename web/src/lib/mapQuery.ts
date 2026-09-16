// Pure request parsing for GET /api/events/map. The map sends a Leaflet viewport
// plus whatever filters the page's URL carries; this turns that into the
// MapEventOptions the shared query helper takes, or an error string the route
// answers with 400. No SQL and no bindings here, so it unit-tests standalone.
import {
  CATEGORY_SLUGS,
  MAP_DEFAULT_LIMIT,
  MAP_MAX_LIMIT,
  MAP_MAX_SPAN_DEG,
  dateRangeFor,
  isYmd,
  nearestCity,
  type BoundsBox,
  type MapEventOptions,
} from '@findlocal/shared';

/** `bbox=minLng,minLat,maxLng,maxLat` — the order Leaflet's toBBoxString() uses. */
export type BboxResult = { ok: true; box: BoundsBox } | { ok: false; error: string };

const WHEN_BUCKETS = new Set(['anytime', 'today', 'tomorrow', 'weekend', 'week']);
const MAX_TEXT = 100;

export function parseBbox(raw: string | null): BboxResult {
  if (!raw?.trim()) return { ok: false, error: 'bbox is required: bbox=minLng,minLat,maxLng,maxLat' };
  // Number('') is 0, so empty segments must be rejected before the conversion.
  const raws = raw.split(',').map((s) => s.trim());
  const parts = raws.map((s) => (s === '' ? Number.NaN : Number(s)));
  if (parts.length !== 4 || !parts.every((n) => Number.isFinite(n))) {
    return { ok: false, error: 'bbox must be four numbers: minLng,minLat,maxLng,maxLat' };
  }
  const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number];
  const box: BoundsBox = { minLat, minLng, maxLat, maxLng };
  if (minLat >= maxLat || minLng >= maxLng) return { ok: false, error: 'bbox min must be strictly less than max' };
  if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) {
    return { ok: false, error: 'bbox is out of range (lat -90..90, lng -180..180)' };
  }
  if (maxLat - minLat > MAP_MAX_SPAN_DEG || maxLng - minLng > MAP_MAX_SPAN_DEG) {
    return { ok: false, error: `bbox is too large: at most ${MAP_MAX_SPAN_DEG} degrees on each side` };
  }
  return { ok: true, box };
}

function normText(raw: string | null): string | undefined {
  const t = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
  return t || undefined;
}

function parseLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isInteger(n) || n < 1) return MAP_DEFAULT_LIMIT;
  return Math.min(n, MAP_MAX_LIMIT);
}

/** `when` bucket or an explicit YYYY-MM-DD; anything else is `anytime`. */
function normWhen(raw: string | null): string {
  const w = (raw ?? '').trim().toLowerCase();
  if (WHEN_BUCKETS.has(w) || isYmd(w)) return w;
  return 'anytime';
}

export type MapParamsResult = { ok: true; options: MapEventOptions } | { ok: false; error: string };

/**
 * Full query contract for /api/events/map. Dates resolve in the time zone of the
 * metro nearest the viewport centre (the endpoint has no city of its own, and a
 * bbox can straddle two metros). `when=anytime` leaves `to` null: no upper bound.
 */
export function parseMapParams(params: URLSearchParams, now: Date = new Date()): MapParamsResult {
  const bbox = parseBbox(params.get('bbox'));
  if (!bbox.ok) return bbox;
  const { box } = bbox;
  const tz = nearestCity((box.minLat + box.maxLat) / 2, (box.minLng + box.maxLng) / 2).tz;
  const range = dateRangeFor(normWhen(params.get('when')), tz, now);
  const cats = [
    ...new Set(
      params
        .getAll('cat')
        .flatMap((v) => v.split(','))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => CATEGORY_SLUGS.includes(s)),
    ),
  ];
  const options: MapEventOptions = {
    ...box,
    from: range.from,
    to: range.to,
    tz,
    limit: parseLimit(params.get('limit')),
    sort: params.get('sort') === 'date' ? 'date' : 'featured',
  };
  if (cats.length) options.categories = cats;
  if (params.get('free') === '1') options.free = true;
  if (params.get('paid') === '1') options.paid = true;
  if (params.get('authors') === '1') options.authorsOnly = true;
  const q = normText(params.get('q'));
  if (q) options.text = q;
  return { ok: true, options };
}
