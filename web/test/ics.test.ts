import { describe, expect, it } from 'vitest';
import { buildEventIcs, foldLine, googleCalendarUrl, icsEscape, utcStamp, type CalendarEvent } from '../src/lib/ics.js';

const base: CalendarEvent = {
  id: 'f1de7878-2b80-4cf4-9247-c49e2b2e3afd',
  title: 'Jazz Night; with, friends',
  description: 'Line one\nLine two',
  event_date: '2026-09-11',
  start_time: '19:30',
  end_time: null,
  venue_name: 'Wally\'s Cafe',
  venue_address: '427 Massachusetts Ave, Boston, MA',
  city: 'Boston',
  ticket_page_url: 'https://example.com/t',
  detail_page_url: null,
};
const NOW = new Date('2026-09-04T12:00:00Z');

describe('ics helpers', () => {
  it('escapes and folds per RFC 5545', () => {
    expect(icsEscape('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
    const folded = foldLine(`SUMMARY:${'x'.repeat(100)}`);
    expect(folded.split('\r\n')[0]!.length).toBe(73);
    expect(folded.split('\r\n')[1]!.startsWith(' ')).toBe(true);
  });
  it('converts local wall clock to UTC with DST awareness', () => {
    expect(utcStamp({ ymd: '2026-09-11', h: 19, m: 30 }, 'America/New_York')).toBe('20260911T233000Z');
    expect(utcStamp({ ymd: '2026-12-11', h: 19, m: 30 }, 'America/New_York')).toBe('20261212T003000Z');
    expect(utcStamp({ ymd: '2026-09-11', h: 19, m: 30 }, 'America/Los_Angeles')).toBe('20260912T023000Z');
  });
});

describe('buildEventIcs', () => {
  it('emits a timed VEVENT with TZID and a 2h default duration', () => {
    const ics = buildEventIcs(base, 'America/New_York', NOW);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('TZID:America/New_York');
    expect(ics).toContain('DTSTART;TZID=America/New_York:20260911T193000');
    expect(ics).toContain('DTEND;TZID=America/New_York:20260911T213000');
    expect(ics).toContain('UID:f1de7878-2b80-4cf4-9247-c49e2b2e3afd@findlocal.community');
    expect(ics).toContain('SUMMARY:Jazz Night\\; with\\, friends');
    expect(ics).toContain('Tickets: https://example.com/t');
    expect(ics.replace(/\r\n /g, '')).toContain('URL:https://findlocal.community/event/f1de7878-2b80-4cf4-9247-c49e2b2e3afd');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('uses all-day dates when there is no start time and honours end_time', () => {
    const allDay = buildEventIcs({ ...base, start_time: null }, 'America/Chicago', NOW);
    expect(allDay).toContain('DTSTART;VALUE=DATE:20260911');
    expect(allDay).toContain('DTEND;VALUE=DATE:20260912');
    expect(allDay).not.toContain('VTIMEZONE');
    const ended = buildEventIcs({ ...base, end_time: '23:00' }, 'America/New_York', NOW);
    expect(ended).toContain('DTEND;TZID=America/New_York:20260911T230000');
    const overnight = buildEventIcs({ ...base, start_time: '22:00', end_time: '01:00' }, 'America/New_York', NOW);
    expect(overnight).toContain('DTEND;TZID=America/New_York:20260912T010000');
  });
});

describe('googleCalendarUrl', () => {
  it('builds a TEMPLATE url with UTC stamps and location', () => {
    const url = new URL(googleCalendarUrl(base, 'America/New_York'));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20260911T233000Z/20260912T013000Z');
    expect(url.searchParams.get('location')).toBe("Wally's Cafe, 427 Massachusetts Ave, Boston, MA");
    expect(url.searchParams.get('ctz')).toBe('America/New_York');
    expect(new URL(googleCalendarUrl({ ...base, start_time: null }, 'America/New_York')).searchParams.get('dates')).toBe('20260911/20260912');
  });
});
