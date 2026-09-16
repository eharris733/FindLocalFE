// The fl_city cookie is written by two islands (CityPicker, GeoHint) and read by
// the middleware, which also folds its value into the edge-cache key. Both
// islands go through cityCookieHeader(), so the exact string is pinned here.
import { describe, expect, it } from 'vitest';
import { CITY_COOKIE, CITY_COOKIE_MAX_AGE, cityCookieHeader, hasCityCookie } from '../src/lib/cityCookie.js';
import { CITY_COOKIE as CITY_COOKIE_FROM_CACHE_KEY, readCookie } from '../src/lib/cacheKey.js';

describe('cityCookieHeader', () => {
  it('matches the documented contract exactly', () => {
    expect(cityCookieHeader('Boston')).toBe('fl_city=Boston; Path=/; Max-Age=31536000; SameSite=Lax');
    expect(CITY_COOKIE).toBe('fl_city');
    expect(CITY_COOKIE_MAX_AGE).toBe(31536000);
    // One definition: the server reader imports the same constant.
    expect(CITY_COOKIE_FROM_CACHE_KEY).toBe(CITY_COOKIE);
  });

  it('URL-encodes the city name, so readCookie round-trips it', () => {
    for (const name of ['New York', 'Portland ME', 'St. Louis', 'Washington']) {
      const header = cityCookieHeader(name);
      expect(header).toContain(encodeURIComponent(name));
      expect(readCookie(header.split(';')[0]!, CITY_COOKIE)).toBe(name);
    }
  });

  it('hasCityCookie only matches the whole cookie name', () => {
    expect(hasCityCookie('fl_city=Boston')).toBe(true);
    expect(hasCityCookie('a=1; fl_city=New%20York; b=2')).toBe(true);
    expect(hasCityCookie('')).toBe(false);
    expect(hasCityCookie('fl_geo_hint_dismissed=1')).toBe(false);
    // not a suffix match: another cookie ending in the name must not count
    expect(hasCityCookie('my_fl_city=Boston')).toBe(false);
  });
});
