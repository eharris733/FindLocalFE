import { describe, expect, it } from 'vitest';
import { parseBbox, parseMapParams } from '../src/lib/mapQuery.js';

const NOW = new Date('2026-09-16T16:00:00Z'); // Wednesday, noon in Boston
const q = (s: string) => new URLSearchParams(s);
const BOSTON_BBOX = 'bbox=-71.2,42.3,-71.0,42.4';

describe('parseBbox', () => {
  it('reads minLng,minLat,maxLng,maxLat (Leaflet toBBoxString order)', () => {
    const r = parseBbox('-71.2,42.3,-71.0,42.4');
    expect(r).toEqual({ ok: true, box: { minLat: 42.3, minLng: -71.2, maxLat: 42.4, maxLng: -71.0 } });
  });

  it('requires the parameter', () => {
    expect(parseBbox(null).ok).toBe(false);
    expect(parseBbox('   ').ok).toBe(false);
  });

  it('rejects wrong arity and non-numbers', () => {
    for (const bad of ['1,2,3', '1,2,3,4,5', 'a,b,c,d', '-71.2,42.3,-71.0,']) {
      const r = parseBbox(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/four numbers|required/);
    }
  });

  it('rejects an inverted box', () => {
    const r = parseBbox('-71.0,42.3,-71.2,42.4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/strictly less/);
  });

  it('rejects out-of-range coordinates', () => {
    const r = parseBbox('-181,42.3,-71.0,42.4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/out of range/);
  });

  it('rejects a box wider or taller than 4 degrees', () => {
    expect(parseBbox('-80,42,-70,43').ok).toBe(false);
    expect(parseBbox('-72,38,-71,43').ok).toBe(false);
    expect(parseBbox('-74,40,-71,43').ok).toBe(true); // exactly 3° each way
  });
});

describe('parseMapParams', () => {
  it('defaults to anytime (no upper bound), featured order and a capped limit', () => {
    const r = parseMapParams(q(BOSTON_BBOX), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.options.to).toBeNull();
    expect(r.options.from).toBe('2026-09-16');
    expect(r.options.sort).toBe('featured');
    expect(r.options.limit).toBe(200);
    expect(r.options.tz).toBe('America/New_York'); // nearest metro to the box centre
  });

  it('resolves `when` in the time zone of the metro nearest the viewport centre', () => {
    const r = parseMapParams(q('bbox=-105.1,39.6,-104.9,39.8&when=today'), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.options.tz).toBe('America/Denver');
    expect(r.options.from).toBe('2026-09-16');
    expect(r.options.to).toBe('2026-09-16');
  });

  it('accepts a literal date and the week/weekend buckets', () => {
    const day = parseMapParams(q(`${BOSTON_BBOX}&when=2026-10-02`), NOW);
    expect(day.ok && day.options.from).toBe('2026-10-02');
    expect(day.ok && day.options.to).toBe('2026-10-02');
    const week = parseMapParams(q(`${BOSTON_BBOX}&when=week`), NOW);
    expect(week.ok && week.options.to).toBe('2026-09-22'); // 7 days inclusive
  });

  it('ignores an unknown `when` (falls back to anytime)', () => {
    const r = parseMapParams(q(`${BOSTON_BBOX}&when=someday`), NOW);
    expect(r.ok && r.options.to).toBeNull();
  });

  it('keeps only known category slugs, comma or repeated', () => {
    const r = parseMapParams(q(`${BOSTON_BBOX}&cat=music,bogus&cat=comedy`), NOW);
    expect(r.ok && r.options.categories).toEqual(['music', 'comedy']);
    const none = parseMapParams(q(`${BOSTON_BBOX}&cat=bogus`), NOW);
    expect(none.ok && none.options.categories).toBeUndefined();
  });

  it('passes free/paid/authors/q through and clamps limit', () => {
    const r = parseMapParams(q(`${BOSTON_BBOX}&free=1&paid=1&authors=1&q=  jazz   trio &limit=9999`), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.options.free).toBe(true);
    expect(r.options.paid).toBe(true);
    expect(r.options.authorsOnly).toBe(true);
    expect(r.options.text).toBe('jazz trio');
    expect(r.options.limit).toBe(400);
    expect(parseMapParams(q(`${BOSTON_BBOX}&limit=0`), NOW).ok && parseMapParams(q(`${BOSTON_BBOX}&limit=0`), NOW)).toMatchObject({ options: { limit: 200 } });
  });

  it('accepts sort=date', () => {
    expect(parseMapParams(q(`${BOSTON_BBOX}&sort=date`), NOW).ok && parseMapParams(q(`${BOSTON_BBOX}&sort=date`), NOW)).toMatchObject({ options: { sort: 'date' } });
    expect(parseMapParams(q(`${BOSTON_BBOX}&sort=nonsense`), NOW).ok && parseMapParams(q(`${BOSTON_BBOX}&sort=nonsense`), NOW)).toMatchObject({ options: { sort: 'featured' } });
  });

  it('surfaces the bbox error instead of a box', () => {
    const r = parseMapParams(q('bbox=-80,42,-70,43&when=today'), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/);
  });
});
