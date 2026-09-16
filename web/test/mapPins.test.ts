import { describe, expect, it } from 'vitest';
import { PIN_COLOR_DEFAULT, bboxParam, groupByVenue, pinColor, pinDateLabel, pinTimeLabel, type MapApiRow } from '../src/lib/mapPins.js';

const row = (o: Partial<MapApiRow> & Pick<MapApiRow, 'id' | 'venue_id'>): MapApiRow => ({
  title: 'Show',
  event_date: '2026-09-20',
  start_time: '19:30:00',
  category: 'music',
  image: null,
  venue_name: 'The Sinclair',
  lat: 42.373,
  lng: -71.119,
  price_min: null,
  free: false,
  path: `/event/${o.id}`,
  ...o,
});

describe('pinColor', () => {
  it('gives each category its own hue and falls back to teal', () => {
    expect(pinColor('music')).not.toBe(pinColor('comedy'));
    expect(pinColor(null)).toBe(PIN_COLOR_DEFAULT);
    expect(pinColor('not-a-category')).toBe(PIN_COLOR_DEFAULT);
  });
});

describe('pinDateLabel / pinTimeLabel', () => {
  it('formats a plain calendar day in UTC (never shifting the day)', () => {
    expect(pinDateLabel('2026-09-20', null)).toBe('Sun, Sep 20');
    expect(pinDateLabel('2026-01-01', '00:30:00')).toBe('Thu, Jan 1 · 12:30 AM');
    expect(pinDateLabel('2026-09-20', '19:30:00')).toBe('Sun, Sep 20 · 7:30 PM');
  });
  it('handles noon, midnight and junk times', () => {
    expect(pinTimeLabel('12:00:00')).toBe('12:00 PM');
    expect(pinTimeLabel('00:00')).toBe('12:00 AM');
    expect(pinTimeLabel(null)).toBe('');
    expect(pinTimeLabel('nope')).toBe('');
  });
  it('passes a malformed date straight through', () => {
    expect(pinDateLabel('not-a-date', null)).toBe('not-a-date');
  });
});

describe('groupByVenue', () => {
  it('makes one pin per venue, counting every event and keeping API order', () => {
    const pins = groupByVenue([
      row({ id: 'a', venue_id: 'v1', title: 'First' }),
      row({ id: 'b', venue_id: 'v2', venue_name: 'Paradise', title: 'Other' }),
      row({ id: 'c', venue_id: 'v1', title: 'Second' }),
    ]);
    expect(pins.map((p) => p.title)).toEqual(['The Sinclair', 'Paradise']);
    expect(pins[0]!.count).toBe(2);
    expect(pins[0]!.href).toBe('/venue/v1');
    expect(pins[0]!.items.map((i) => i.label)).toEqual(['First', 'Second']);
    expect(pins[0]!.items[0]!.meta).toBe('Sun, Sep 20 · 7:30 PM');
  });

  it('takes the image and category from the first row that has them', () => {
    const pins = groupByVenue([
      row({ id: 'a', venue_id: 'v1', image: null, category: null }),
      row({ id: 'b', venue_id: 'v1', image: 'https://img/x.jpg', category: 'comedy' }),
    ]);
    expect(pins[0]!.image).toBe('https://img/x.jpg');
    expect(pins[0]!.category).toBe('comedy');
  });

  it('caps the item lines but keeps counting', () => {
    const rows = Array.from({ length: 9 }, (_, i) => row({ id: `e${i}`, venue_id: 'v1', title: `E${i}` }));
    const pin = groupByVenue(rows)[0]!;
    expect(pin.count).toBe(9);
    expect(pin.items.length).toBe(4);
    expect(groupByVenue(rows, 2)[0]!.items.length).toBe(2);
  });

  it('skips rows with unusable coordinates', () => {
    expect(groupByVenue([row({ id: 'a', venue_id: 'v1', lat: Number.NaN })])).toEqual([]);
  });
});

describe('bboxParam', () => {
  it('emits minLng,minLat,maxLng,maxLat rounded to 4 decimals', () => {
    expect(bboxParam({ west: -71.123456, south: 42.3000004, east: -71.0, north: 42.4 })).toBe('-71.1235,42.3,-71,42.4');
  });
  it('clamps a viewport that ran off the world', () => {
    expect(bboxParam({ west: -200, south: -95, east: 200, north: 95 })).toBe('-180,-90,180,90');
  });
});
