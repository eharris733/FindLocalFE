// The `fl_city` cookie — one definition, shared by the server reader and the two
// client islands that write it.
//
// Two islands write it: `CityPicker` (the <select> and "Use my location") and
// `GeoHint` (accepting the suggested metro). They must agree byte for byte: the
// middleware reads the cookie to pick the city for `/`, `/venues` and `/map`, and
// `cacheKeyFor` folds the *value* into the edge-cache key — a stray `Path`,
// `Max-Age` or double-encoded name would silently split the cache or drop the
// choice on the next navigation. So neither island formats the cookie itself;
// both call `setCityCookie(city.name)`.
//
// The value is the `City.name` (URL-encoded), not the slug — `getCity()` on the
// server takes the name. Pure helpers here are unit-tested in web/test/cityCookie.test.ts.

export const CITY_COOKIE = 'fl_city';

/** One year, matching the documented cookie contract in CLAUDE.md. */
export const CITY_COOKIE_MAX_AGE = 31536000;

/** The exact `document.cookie` string for a city name. Pure, so it can be tested. */
export function cityCookieHeader(cityName: string): string {
  return `${CITY_COOKIE}=${encodeURIComponent(cityName)}; Path=/; Max-Age=${CITY_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Remember the visitor's city. The ONLY way this cookie is ever written. */
export function setCityCookie(cityName: string): void {
  document.cookie = cityCookieHeader(cityName);
}

/** True when a city has already been chosen (so GeoHint stays quiet). */
export function hasCityCookie(cookie: string = document.cookie): boolean {
  return new RegExp(`(?:^|;\\s*)${CITY_COOKIE}=`).test(cookie);
}
