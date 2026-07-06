/**
 * Canonical launch-city metadata. Coordinates are city centers and drive
 * (a) "Nearby" ordering in the city picker and (b) map centering.
 *
 * Keep names in sync with the `city` values used in the venues/events_gold
 * tables — matching is done on the exact display name.
 */
export interface CityInfo {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

export const CITIES: CityInfo[] = [
  { name: 'Atlanta', state: 'GA', latitude: 33.749, longitude: -84.388 },
  { name: 'Austin', state: 'TX', latitude: 30.2672, longitude: -97.7431 },
  { name: 'Baltimore', state: 'MD', latitude: 39.2904, longitude: -76.6122 },
  { name: 'Boston', state: 'MA', latitude: 42.3601, longitude: -71.0589 },
  { name: 'Burlington', state: 'VT', latitude: 44.4759, longitude: -73.2121 },
  { name: 'Charlotte', state: 'NC', latitude: 35.2271, longitude: -80.8431 },
  { name: 'Chicago', state: 'IL', latitude: 41.8781, longitude: -87.6298 },
  { name: 'Cincinnati', state: 'OH', latitude: 39.1031, longitude: -84.512 },
  { name: 'Dallas', state: 'TX', latitude: 32.7767, longitude: -96.797 },
  { name: 'Denver', state: 'CO', latitude: 39.7392, longitude: -104.9903 },
  { name: 'Detroit', state: 'MI', latitude: 42.3314, longitude: -83.0458 },
  { name: 'Houston', state: 'TX', latitude: 29.7604, longitude: -95.3698 },
  { name: 'Kansas City', state: 'MO', latitude: 39.0997, longitude: -94.5786 },
  { name: 'Las Vegas', state: 'NV', latitude: 36.1699, longitude: -115.1398 },
  { name: 'Los Angeles', state: 'CA', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Miami', state: 'FL', latitude: 25.7617, longitude: -80.1918 },
  { name: 'Minneapolis', state: 'MN', latitude: 44.9778, longitude: -93.265 },
  { name: 'New York', state: 'NY', latitude: 40.7128, longitude: -74.006 },
  { name: 'Orlando', state: 'FL', latitude: 28.5384, longitude: -81.3789 },
  { name: 'Philadelphia', state: 'PA', latitude: 39.9526, longitude: -75.1652 },
  { name: 'Phoenix', state: 'AZ', latitude: 33.4484, longitude: -112.074 },
  { name: 'Pittsburgh', state: 'PA', latitude: 40.4406, longitude: -79.9959 },
  { name: 'Portland', state: 'OR', latitude: 45.5152, longitude: -122.6784 },
  { name: 'Sacramento', state: 'CA', latitude: 38.5816, longitude: -121.4944 },
  { name: 'San Antonio', state: 'TX', latitude: 29.4241, longitude: -98.4936 },
  { name: 'San Diego', state: 'CA', latitude: 32.7157, longitude: -117.1611 },
  { name: 'San Francisco', state: 'CA', latitude: 37.7749, longitude: -122.4194 },
  { name: 'Seattle', state: 'WA', latitude: 47.6062, longitude: -122.3321 },
  { name: 'St. Louis', state: 'MO', latitude: 38.627, longitude: -90.1994 },
  { name: 'Tampa', state: 'FL', latitude: 27.9506, longitude: -82.4572 },
  { name: 'Washington', state: 'DC', latitude: 38.9072, longitude: -77.0369 },
];

const cityIndex = new Map(CITIES.map((c) => [c.name.toLowerCase(), c]));

export const getCityInfo = (name?: string | null): CityInfo | undefined =>
  name ? cityIndex.get(name.trim().toLowerCase()) : undefined;

/** Great-circle distance in kilometers. */
export const distanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Orders city names by distance from a location. Names without coordinate
 * data sort last, keeping their alphabetical order.
 */
export const sortCitiesByDistance = (
  cityNames: string[],
  latitude: number,
  longitude: number
): string[] =>
  [...cityNames].sort((a, b) => {
    const ca = getCityInfo(a);
    const cb = getCityInfo(b);
    if (!ca && !cb) return a.localeCompare(b);
    if (!ca) return 1;
    if (!cb) return -1;
    return (
      distanceKm(latitude, longitude, ca.latitude, ca.longitude) -
      distanceKm(latitude, longitude, cb.latitude, cb.longitude)
    );
  });
