// Canonical metro list, vendored from FindLocalData/src/data/cities.json via
// `npm run sync-data`. City.name matches venues.city / events.city exactly.
import raw from '../data/cities.json';

export interface City {
  slug: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  tz: string;
}

export const CITIES: City[] = (raw as { cities: City[] }).cities;

const BY_NAME = new Map(CITIES.map((c) => [c.name.toLowerCase(), c]));
const BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));

/** Look a city up by its display name, case-insensitively ("new york" -> New York). */
export function getCity(name: string | null | undefined): City | undefined {
  if (!name) return undefined;
  return BY_NAME.get(name.trim().toLowerCase());
}

export function cityBySlug(slug: string | null | undefined): City | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug.trim().toLowerCase());
}

/** lowercase, dots dropped, spaces -> dashes: "St. Louis" -> "st-louis". */
export function citySlug(name: string): string {
  return name.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '-');
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The metro whose centre is closest to (lat, lng) by great-circle distance. */
export function nearestCity(lat: number, lng: number): City {
  let best = CITIES[0] as City;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best;
}
