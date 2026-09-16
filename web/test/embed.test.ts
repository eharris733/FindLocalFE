import { describe, expect, it } from 'vitest';
import { getCity } from '@findlocal/shared';
import {
  buildEmbedSrc, embedCityFilters, embedGroupRange, embedScope, embedWhenRange, eventUrl, matchesEmbedFilters,
  parseEmbedParams, readUiState, siteUrl, toggleAuthorsHref, uiQuery, uiStateIsEmpty, venueUrl,
} from '../src/lib/embed.js';

const O = 'https://findlocal.community';
const q = (s: string) => new URLSearchParams(s);

describe('buildEmbedSrc', () => {
  it('expands presets and sorts keys', () => {
    expect(buildEmbedSrc(O, { widget: 'literary-new-england' })).toBe(`${O}/embed/events?cat=literary&region=new-england`);
    expect(buildEmbedSrc(O, { widget: 'New-England' })).toBe(`${O}/embed/events?region=new-england`);
    expect(buildEmbedSrc(`${O}/`, {})).toBe(`${O}/embed/events`);
    expect(buildEmbedSrc(O, { widget: 'literary-new-england-authors' })).toBe(`${O}/embed/events?authors=1&cat=literary&region=new-england`);
  });
  it('authors is only ever "1"', () => {
    expect(buildEmbedSrc(O, { city: 'boston', authors: '1' })).toBe(`${O}/embed/events?authors=1&city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', authors: '0' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { widget: 'literary-new-england-authors', authors: 'no' })).toBe(`${O}/embed/events?cat=literary&region=new-england`);
  });
  it('explicit attributes win over the preset; region beats city', () => {
    expect(buildEmbedSrc(O, { widget: 'literary-new-england', cat: 'music' })).toBe(`${O}/embed/events?cat=music&region=new-england`);
    expect(buildEmbedSrc(O, { region: 'new-england', city: 'boston' })).toBe(`${O}/embed/events?region=new-england`);
    expect(buildEmbedSrc(O, { city: 'boston', cat: 'comedy' })).toBe(`${O}/embed/events?cat=comedy&city=boston`);
  });
  it('drops defaults and invalid values, clamps limit', () => {
    expect(buildEmbedSrc(O, { city: 'boston', view: 'list', theme: 'auto', when: 'anytime', limit: '100' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', view: 'map', theme: 'dark', when: 'week', limit: '25' })).toBe(`${O}/embed/events?city=boston&limit=25&theme=dark&view=map&when=week`);
    expect(buildEmbedSrc(O, { city: 'boston', view: 'grid', theme: 'neon', limit: 'abc' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', limit: '9999' })).toBe(`${O}/embed/events?city=boston&limit=300`);
    expect(buildEmbedSrc(O, { city: 'boston', limit: '0' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', partner: 'acme' })).toBe(`${O}/embed/events?city=boston&partner=acme`);
  });
});

describe('parseEmbedParams', () => {
  it('resolves a region group and strips embed-only keys from the filter params', () => {
    const p = parseEmbedParams(q('region=new-england&cat=literary&view=map&theme=dark&limit=50&when=week&partner=acme'));
    expect(p.group?.slug).toBe('new-england');
    expect(p.city).toBeUndefined();
    expect(p.view).toBe('map');
    expect(p.theme).toBe('dark');
    expect(p.limit).toBe(50);
    expect(p.partner).toBe('acme');
    expect(p.campaign).toBe('new-england-literary');
    expect([...p.filterParams.keys()].sort()).toEqual(['cat', 'when']);
    expect(p.filterParams.get('region')).toBeNull();
  });
  it('region wins over city; unknown values produce an error; no scope defaults to Boston', () => {
    expect(parseEmbedParams(q('region=new-england&city=boston')).group?.slug).toBe('new-england');
    expect(parseEmbedParams(q('region=narnia')).error).toBe('unknown-region');
    expect(parseEmbedParams(q('city=narnia')).error).toBe('unknown-city');
    const boston = parseEmbedParams(q(''));
    expect(boston.city?.name).toBe('Boston');
    expect(boston.campaign).toBe('boston');
    expect(parseEmbedParams(q('city=Portland%20ME')).city?.slug).toBe('portland-me');
    expect(parseEmbedParams(q('city=portland-me')).city?.name).toBe('Portland ME');
  });
  it('categories are validated: a typo is an error, not "all categories"; authors=1 flags author-only', () => {
    const ok = parseEmbedParams(q('region=new-england&cat=literary,Bogus&authors=1'));
    expect(ok.categories).toEqual(['literary']);
    expect(ok.authorsOnly).toBe(true);
    expect(ok.campaign).toBe('new-england-literary-authors');
    expect(ok.filterParams.get('authors')).toBe('1'); // parseFilters sees it on the city path
    expect(parseEmbedParams(q('region=new-england&cat=literry')).error).toBe('unknown-category');
    expect(parseEmbedParams(q('region=new-england&cat=')).error).toBeUndefined();
    expect(parseEmbedParams(q('city=boston&authors=0')).authorsOnly).toBe(false);
    expect(parseEmbedParams(q('city=boston')).categories).toEqual([]);
  });
  it('toggleAuthorsHref flips authors=1 and keeps the rest sorted', () => {
    const u = new URL(`${O}/embed/events?region=new-england&cat=literary&theme=dark`);
    expect(toggleAuthorsHref(u, true)).toBe('/embed/events?authors=1&cat=literary&region=new-england&theme=dark');
    expect(toggleAuthorsHref(new URL(`${O}/embed/events?authors=1&cat=literary`), false)).toBe('/embed/events?cat=literary');
    expect(toggleAuthorsHref(new URL(`${O}/embed/events?authors=1`), false)).toBe('/embed/events');
  });
  it('defaults and clamps view/theme/limit, sanitises partner, accepts from/to', () => {
    const p = parseEmbedParams(q('city=boston&view=grid&theme=neon&limit=9999&partner=<b>ac me</b>&from=2026-10-01&to=2026-10-31'));
    expect(p.view).toBe('list');
    expect(p.theme).toBe('auto');
    expect(p.limit).toBe(300);
    expect(p.partner).toBe('bacmeb');
    expect(p.from).toBe('2026-10-01');
    expect(p.to).toBe('2026-10-31');
    expect(parseEmbedParams(q('limit=-5')).limit).toBe(100);
    expect(parseEmbedParams(q('from=tomorrow')).from).toBeUndefined();
  });
  it('embedCityFilters / embedGroupRange apply the explicit window over `when`', () => {
    const now = new Date('2026-09-05T15:00:00Z');
    const boston = getCity('Boston')!;
    const f = embedCityFilters(parseEmbedParams(q('city=boston&when=today&limit=10&region=')), boston, now);
    expect(f.city).toBe('Boston');
    expect(f.region).toBeUndefined();
    expect(f.from).toBe('2026-09-05');
    expect(f.to).toBe('2026-09-05');
    expect(f.limit).toBe(11);
    const g = parseEmbedParams(q('region=new-england&when=today&from=2026-10-01&to=2026-10-02'));
    expect(embedGroupRange(g, g.group!, now)).toEqual({ from: '2026-10-01', to: '2026-10-02' });
    const g2 = parseEmbedParams(q('region=new-england&when=today'));
    expect(embedGroupRange(g2, g2.group!, now)).toEqual({ from: '2026-09-05', to: '2026-09-05' });
    const g3 = parseEmbedParams(q('region=new-england'));
    expect(embedGroupRange(g3, g3.group!, now)).toEqual({ from: '2026-09-05', to: null });
  });
});

describe('buildEmbedSrc: filter-toolbar attributes (B5)', () => {
  it('writes only the filters opt-out, validates near, drops a lone/default radius', () => {
    expect(buildEmbedSrc(O, { city: 'boston', filters: 'off' })).toBe(`${O}/embed/events?city=boston&filters=0`);
    expect(buildEmbedSrc(O, { city: 'boston', filters: 'on' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', filters: 'sure' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', near: '42.36012345,-71.05891234' }))
      .toBe(`${O}/embed/events?city=boston&near=42.36%2C-71.059`);
    expect(buildEmbedSrc(O, { city: 'boston', near: '42.36,-71.06', radius: '10' }))
      .toBe(`${O}/embed/events?city=boston&near=42.36%2C-71.06&radius_km=10`);
    expect(buildEmbedSrc(O, { city: 'boston', near: '42.36,-71.06', radius: '25' }))
      .toBe(`${O}/embed/events?city=boston&near=42.36%2C-71.06`);
    expect(buildEmbedSrc(O, { city: 'boston', near: '42.36,-71.06', radius: '9999' }))
      .toBe(`${O}/embed/events?city=boston&near=42.36%2C-71.06&radius_km=200`);
    expect(buildEmbedSrc(O, { city: 'boston', near: 'somewhere', radius: '10' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', radius: '50' })).toBe(`${O}/embed/events?city=boston`);
    expect(buildEmbedSrc(O, { city: 'boston', free: '1' })).toBe(`${O}/embed/events?city=boston&free=1`);
    expect(buildEmbedSrc(O, { city: 'boston', free: 'yes' })).toBe(`${O}/embed/events?city=boston`);
  });
});

describe('readUiState / uiQuery', () => {
  it('reads every toolbar key, including the no-JS `price` radio and repeated params', () => {
    const s = readUiState(q('q=+poetry++slam+&when=month&tod=evening,morning&ucat=music&ucat=comedy&price=free&authors=1&near=42.3601,-71.0589&radius_km=10&place=Somerville%2C+MA'));
    expect(s).toEqual({
      q: 'poetry slam',
      when: 'month',
      price: 'free',
      tod: ['morning', 'evening'],
      cats: ['music', 'comedy'],
      authorsOnly: true,
      near: { lat: 42.36, lng: -71.059, radiusKm: 10 },
      place: 'Somerville, MA',
    });
    expect(readUiState(q('free=1&paid=1')).price).toBe('any');
    expect(readUiState(q('price=paid')).price).toBe('paid');
    expect(readUiState(q('when=whenever&tod=midnight&ucat=bogus')).when).toBe('anytime');
    expect(readUiState(q('when=whenever&tod=midnight&ucat=bogus')).tod).toEqual([]);
    expect(readUiState(q('near=42.36')).near).toBeUndefined();
    expect(readUiState(q('near=42.36,-71.06')).near?.radiusKm).toBe(25);
    expect(uiStateIsEmpty(readUiState(q('')))).toBe(true);
    expect(uiStateIsEmpty(readUiState(q('free=1')))).toBe(false);
  });
  it('keeps the partner keys, canonicalises its own, and round-trips', () => {
    const base = q('city=boston&cat=literary&limit=20&theme=dark&q=old&free=1&price=paid&ucat=music');
    const state = readUiState(q('q=book&when=weekend&price=free&tod=evening&ucat=literary&near=42.36,-71.06&radius_km=25&place=Boston'));
    const out = uiQuery(base, state);
    expect(out).toBe('cat=literary&city=boston&free=1&limit=20&near=42.36%2C-71.06&place=Boston&q=book&theme=dark&tod=evening&ucat=literary&when=weekend');
    expect(readUiState(q(out))).toEqual(state);
    // Defaults are dropped; `place` only rides along with a point.
    expect(uiQuery(q('city=boston'), readUiState(q('')))).toBe('city=boston');
    expect(uiQuery(q(''), readUiState(q('place=Nowhere')))).toBe('');
  });
});

describe('when=month and the toolbar filters the server cannot express', () => {
  const now = new Date('2026-09-05T15:00:00Z');
  it('embedWhenRange: month = the next 30 days, other buckets defer to the site contract', () => {
    expect(embedWhenRange('month', 'America/New_York', now)).toEqual({ from: '2026-09-05', to: '2026-10-04' });
    expect(embedWhenRange('week', 'America/New_York', now)).toEqual({ from: '2026-09-05', to: '2026-09-11' });
    expect(embedWhenRange('', 'America/New_York', now)).toEqual({ from: '2026-09-05', to: null });
  });
  it('embedCityFilters applies month, ucat, price, tod, q and near', () => {
    const p = parseEmbedParams(q('city=boston&when=month&ucat=music&price=free&tod=evening&q=jazz&near=42.36,-71.06&radius_km=10'));
    const f = embedCityFilters(p, getCity('Boston')!, now);
    expect(f.from).toBe('2026-09-05');
    expect(f.to).toBe('2026-10-04');
    expect(f.categories).toEqual(['music']);
    expect(f.free).toBe(true);
    expect(f.timeOfDay).toEqual(['evening']);
    expect(f.text).toBe('jazz');
    expect(f.near).toEqual({ lat: 42.36, lng: -71.06, radiusKm: 10 });
  });
  it('embedGroupRange understands month too', () => {
    const g = parseEmbedParams(q('region=new-england&when=month'));
    expect(embedGroupRange(g, g.group!, now)).toEqual({ from: '2026-09-05', to: '2026-10-04' });
  });
  it('matchesEmbedFilters mirrors the SQL for the multi-city path', () => {
    const e = { title: 'Poetry Night', venue_name: 'Grolier Poetry Book Shop', start_time: '19:30', price: null, price_amount: 0, performers: [{ name: 'Ada Limón' }] };
    expect(matchesEmbedFilters(e, { city: 'Boston', free: true })).toBe(true);
    expect(matchesEmbedFilters(e, { city: 'Boston', paid: true })).toBe(false);
    expect(matchesEmbedFilters(e, { city: 'Boston', timeOfDay: ['evening'] })).toBe(true);
    expect(matchesEmbedFilters(e, { city: 'Boston', timeOfDay: ['morning'] })).toBe(false);
    expect(matchesEmbedFilters(e, { city: 'Boston', text: 'grolier' })).toBe(true);
    expect(matchesEmbedFilters(e, { city: 'Boston', text: 'limón' })).toBe(true);
    expect(matchesEmbedFilters(e, { city: 'Boston', text: 'techno' })).toBe(false);
    const paid = { ...e, price: '$20', price_amount: 20 };
    expect(matchesEmbedFilters(paid, { city: 'Boston', free: true })).toBe(false);
    expect(matchesEmbedFilters(paid, { city: 'Boston', paid: true })).toBe(true);
    expect(matchesEmbedFilters(paid, { city: 'Boston', maxPrice: 10 })).toBe(false);
    // Price text only ("Donation") counts as paid; "Free admission" as free.
    expect(matchesEmbedFilters({ ...e, price: 'Donation', price_amount: null }, { city: 'Boston', paid: true })).toBe(true);
    expect(matchesEmbedFilters({ ...e, price: 'Free admission', price_amount: null }, { city: 'Boston', free: true })).toBe(true);
  });
});

describe('parseEmbedParams: pinning, the toolbar and `near` scope', () => {
  it('cat pins (chips hidden); ucat is the visitor choice and is ignored while pinned', () => {
    const pinned = parseEmbedParams(q('city=boston&cat=literary&ucat=music'));
    expect(pinned.pinnedCategories).toBe(true);
    expect(pinned.categories).toEqual(['literary']);
    expect(pinned.campaign).toBe('boston-literary');
    const chosen = parseEmbedParams(q('city=boston&ucat=music,comedy'));
    expect(chosen.pinnedCategories).toBe(false);
    expect(chosen.categories).toEqual(['music', 'comedy']);
    expect(chosen.filterParams.get('cat')).toBe('music,comedy');
    // The visitor's chips must not rewrite the partner's attribution.
    expect(chosen.campaign).toBe('boston');
    expect(parseEmbedParams(q('city=boston&ucat=bogus')).categories).toEqual([]);
  });
  it('normalises the form spellings into what parseFilters reads', () => {
    const p = parseEmbedParams(q('city=boston&price=free&tod=evening&tod=morning&place=Somerville'));
    expect(p.filterParams.get('free')).toBe('1');
    expect(p.filterParams.get('paid')).toBeNull();
    expect(p.filterParams.get('tod')).toBe('morning,evening');
    expect(p.filterParams.get('place')).toBeNull();
    expect(p.filterParams.get('price')).toBeNull();
    expect(p.ui.place).toBe('Somerville');
  });
  it('filters=off hides the toolbar; anything else keeps it', () => {
    expect(parseEmbedParams(q('city=boston')).filtersOn).toBe(true);
    expect(parseEmbedParams(q('city=boston&filters=off')).filtersOn).toBe(false);
    expect(parseEmbedParams(q('city=boston&filters=0')).filtersOn).toBe(false);
    expect(parseEmbedParams(q('city=boston&filters=on')).filtersOn).toBe(true);
  });
  it('near replaces the region/city scope with the nearest supported metro', () => {
    const group = parseEmbedParams(q('region=new-england&cat=literary'));
    expect(embedScope(group)).toEqual({ kind: 'group', group: group.group });
    // A point in Providence inside a New England widget: query Providence, not the group.
    const near = parseEmbedParams(q('region=new-england&near=41.824,-71.413&radius_km=10'));
    const scope = embedScope(near);
    expect(scope?.kind).toBe('city');
    expect(scope?.kind === 'city' && scope.city.slug).toBe('providence');
    expect(near.near).toEqual({ lat: 41.824, lng: -71.413, radiusKm: 10 });
    const city = parseEmbedParams(q('city=boston'));
    expect(embedScope(city)).toEqual({ kind: 'city', city: city.city });
  });
});

describe('outbound links carry UTM attribution', () => {
  it('event / venue / site urls', () => {
    expect(eventUrl('abc', 'new-england-literary')).toBe(`${O}/event/abc?utm_source=widget&utm_medium=embed&utm_campaign=new-england-literary`);
    expect(venueUrl('v1', 'boston', 'acme')).toBe(`${O}/venue/v1?utm_source=widget&utm_medium=embed&utm_campaign=boston&utm_content=acme`);
    expect(siteUrl('/', 'boston')).toBe(`${O}/?utm_source=widget&utm_medium=embed&utm_campaign=boston`);
  });
});
