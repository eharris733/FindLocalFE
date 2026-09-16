// web/src/lib/geocode.ts against a stub fetch — no real Photon/Nominatim calls.
// `minIntervalMs: 0` switches off the one-request-per-second gate production uses
// (the gate itself is exercised in the last block). Mirrors
// FindLocalMobile/test/geocode.test.ts so a divergence shows up in both repos.
import { describe, expect, it, vi } from 'vitest';
import { MIN_QUERY_LENGTH, geocode, metroFor, placeLabel } from '../src/lib/geocode.js';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const PHOTON_BODY = {
  features: [
    {
      geometry: { coordinates: [-71.0995, 42.3876] },
      properties: {
        name: 'Somerville', countrycode: 'US', state: 'Massachusetts', county: 'Middlesex County',
        osm_id: 123, osm_type: 'R',
      },
    },
    // Non-US hits are dropped: FindLocal only lists US metros.
    { geometry: { coordinates: [-1.2, 51.2] }, properties: { name: 'Somerville', countrycode: 'GB' } },
  ],
};

const NOMINATIM_BODY = [
  { place_id: 99, lat: '39.7392', lon: '-104.9903', name: 'Denver', display_name: 'Denver, Denver County, Colorado, United States' },
];

/** A stub fetch plus the options that disable throttling. */
function stub(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fetchMock.mockRejectedValueOnce(r);
    else fetchMock.mockResolvedValueOnce(r);
  }
  return { fetchMock, opts: { minIntervalMs: 0, fetch: fetchMock as unknown as typeof fetch } };
}

describe('geocode via Photon', () => {
  it('parses US features and skips everything else', async () => {
    const { fetchMock, opts } = stub(jsonResponse(PHOTON_BODY));

    const places = await geocode('somerville', opts);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      label: 'Somerville', detail: 'Middlesex County, Massachusetts', lat: 42.3876, lng: -71.0995, source: 'photon',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://photon.komoot.io/api/?q=somerville');
    expect(url).toContain('limit=5');
    // Nominatim's policy requires an identifying UA off-browser (a browser would
    // refuse to set it and sends its own).
    expect((init.headers as Record<string, string>)['User-Agent']).toContain('FindLocalWeb');
  });

  it('labels a street address and passes a location bias', async () => {
    const { fetchMock, opts } = stub(jsonResponse({
      features: [{
        geometry: { coordinates: [-71.0636, 42.3581] },
        properties: { housenumber: '11', street: 'Beacon St', postcode: '02108', city: 'Boston', countrycode: 'US' },
      }],
    }));

    const places = await geocode('11 beacon st', { ...opts, near: { lat: 42.36, lng: -71.06 } });

    expect(places[0]?.label).toBe('11 Beacon St');
    expect(places[0]?.detail).toBe('Boston, 02108');
    expect(placeLabel(places[0]!)).toBe('11 Beacon St, Boston, 02108');
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('lat=42.36');
    expect(url).toContain('lon=-71.06');
  });

  it('ignores features without usable coordinates', async () => {
    const { opts } = stub(jsonResponse({ features: [{ properties: { name: 'Nowhere', countrycode: 'US' } }] }), jsonResponse([]));
    expect(await geocode('nowhere', opts)).toEqual([]);
  });
});

describe('Nominatim fallback', () => {
  it('runs when Photon returns nothing usable', async () => {
    const { fetchMock, opts } = stub(jsonResponse({ features: [] }), jsonResponse(NOMINATIM_BODY));

    const places = await geocode('denver', opts);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url] = fetchMock.mock.calls[1] as [string];
    expect(url).toContain('https://nominatim.openstreetmap.org/search');
    expect(url).toContain('countrycodes=us');
    expect(url).toContain('format=jsonv2');
    expect(places[0]).toMatchObject({ label: 'Denver', detail: 'Denver County, Colorado', source: 'nominatim' });
  });

  it('runs when Photon errors, and yields [] when both fail', async () => {
    const first = stub(new Error('offline'), jsonResponse(NOMINATIM_BODY));
    expect(await geocode('denver', first.opts)).toHaveLength(1);

    const second = stub(jsonResponse({}, 502), new Error('offline'));
    expect(await geocode('denver', second.opts)).toEqual([]);
  });
});

describe('query guard', () => {
  it('never calls out for a query shorter than MIN_QUERY_LENGTH', async () => {
    const { fetchMock, opts } = stub();
    expect(await geocode('a'.repeat(MIN_QUERY_LENGTH - 1), opts)).toEqual([]);
    expect(await geocode('   ', opts)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('metroFor', () => {
  it('maps a point to the nearest supported metro', () => {
    expect(metroFor({ lat: 42.3876, lng: -71.0995 }).slug).toBe('boston');
    expect(metroFor({ lat: 39.7392, lng: -104.9903 }).slug).toBe('denver');
  });
});

describe('request spacing', () => {
  it('serialises calls and leaves a gap between them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(PHOTON_BODY));
    const opts = { minIntervalMs: 30, fetch: fetchMock as unknown as typeof fetch };
    const started = Date.now();

    await Promise.all([geocode('boston', opts), geocode('denver', opts)]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Date.now() - started).toBeGreaterThanOrEqual(30);
  });
});
