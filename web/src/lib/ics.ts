// Add-to-calendar helpers (pure): one VEVENT per event as RFC 5545 text, and a
// Google Calendar template URL. Times are the venue's local wall clock in the
// city's IANA zone; events without a start time become all-day entries.
import { addDays, SITE } from '@findlocal/shared';
import { utcOffset } from './jsonld.js';

const DEFAULT_DURATION_MIN = 120;

export function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 line folding: lines over 75 octets continue with CRLF + space. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

// VTIMEZONE definitions for the zones in cities.json. DST zones share the
// 2007+ US rule (2nd Sunday March / 1st Sunday November); Phoenix has none.
const TZ_DEFS: Record<string, { std: string; dst?: string; stdName: string; dstName?: string }> = {
  'America/New_York': { std: '-0500', dst: '-0400', stdName: 'EST', dstName: 'EDT' },
  'America/Detroit': { std: '-0500', dst: '-0400', stdName: 'EST', dstName: 'EDT' },
  'America/Chicago': { std: '-0600', dst: '-0500', stdName: 'CST', dstName: 'CDT' },
  'America/Denver': { std: '-0700', dst: '-0600', stdName: 'MST', dstName: 'MDT' },
  'America/Phoenix': { std: '-0700', stdName: 'MST' },
  'America/Los_Angeles': { std: '-0800', dst: '-0700', stdName: 'PST', dstName: 'PDT' },
};

function vtimezone(tzid: string): string[] {
  const def = TZ_DEFS[tzid] ?? (TZ_DEFS['America/New_York'] as { std: string; dst?: string; stdName: string; dstName?: string });
  const lines = ['BEGIN:VTIMEZONE', `TZID:${tzid}`];
  if (def.dst) {
    lines.push(
      'BEGIN:DAYLIGHT', `TZOFFSETFROM:${def.std}`, `TZOFFSETTO:${def.dst}`, `TZNAME:${def.dstName}`,
      'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
      'BEGIN:STANDARD', `TZOFFSETFROM:${def.dst}`, `TZOFFSETTO:${def.std}`, `TZNAME:${def.stdName}`,
      'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    );
  } else {
    lines.push('BEGIN:STANDARD', `TZOFFSETFROM:${def.std}`, `TZOFFSETTO:${def.std}`, `TZNAME:${def.stdName}`, 'DTSTART:19700101T000000', 'END:STANDARD');
  }
  lines.push('END:VTIMEZONE');
  return lines;
}

interface Local {
  ymd: string;
  h: number;
  m: number;
}

function parseTime(t: string | null | undefined): { h: number; m: number } | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  return h > 23 ? null : { h, m: Number(m[2]) };
}

function addMinutes(l: Local, minutes: number): Local {
  let total = l.h * 60 + l.m + minutes;
  let ymd = l.ymd;
  while (total >= 1440) {
    total -= 1440;
    ymd = addDays(ymd, 1);
  }
  return { ymd, h: Math.floor(total / 60), m: total % 60 };
}

function basicDate(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function localStamp(l: Local): string {
  return `${basicDate(l.ymd)}T${String(l.h).padStart(2, '0')}${String(l.m).padStart(2, '0')}00`;
}

/** Local wall-clock -> 'YYYYMMDDTHHMMSSZ' using the zone's offset for that day. */
export function utcStamp(l: Local, tz: string): string {
  const off = utcOffset(l.ymd, tz); // '-04:00'
  const sign = off.startsWith('-') ? -1 : 1;
  const offMin = sign * (Number(off.slice(1, 3)) * 60 + Number(off.slice(4, 6)));
  const utc = new Date(Date.UTC(Number(l.ymd.slice(0, 4)), Number(l.ymd.slice(5, 7)) - 1, Number(l.ymd.slice(8, 10)), l.h, l.m) - offMin * 60_000);
  return `${utc.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string;
  venue_address: string | null;
  city: string;
  ticket_page_url: string | null;
  detail_page_url: string | null;
}

function calendarDescription(e: CalendarEvent): string {
  const parts = [e.description?.trim() || 'Event details to be announced.'];
  if (e.ticket_page_url) parts.push(`Tickets: ${e.ticket_page_url}`);
  else if (e.detail_page_url) parts.push(`More info: ${e.detail_page_url}`);
  parts.push(`${SITE}/event/${e.id}`);
  return parts.join('\n\n');
}

function location(e: CalendarEvent): string {
  return [e.venue_name, e.venue_address ?? e.city].filter(Boolean).join(', ');
}

function times(e: CalendarEvent): { start: Local; end: Local } | null {
  const st = parseTime(e.start_time);
  if (!st) return null;
  const start = { ymd: e.event_date, ...st };
  const et = parseTime(e.end_time);
  let end = et ? { ymd: e.event_date, ...et } : addMinutes(start, DEFAULT_DURATION_MIN);
  if (et && et.h * 60 + et.m <= st.h * 60 + st.m) end = addMinutes({ ymd: e.event_date, ...et }, 1440);
  return { start, end };
}

/** A complete VCALENDAR with one VEVENT (Apple/Outlook "Add to calendar"). */
export function buildEventIcs(e: CalendarEvent, tz: string, now: Date = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Find Local//findlocal.community//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  ];
  const t = times(e);
  if (t) lines.push(...vtimezone(tz));
  lines.push('BEGIN:VEVENT', `UID:${e.id}@findlocal.community`, `DTSTAMP:${stamp}`);
  if (t) {
    lines.push(`DTSTART;TZID=${tz}:${localStamp(t.start)}`, `DTEND;TZID=${tz}:${localStamp(t.end)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${basicDate(e.event_date)}`, `DTEND;VALUE=DATE:${basicDate(addDays(e.event_date, 1))}`);
  }
  lines.push(
    foldLine(`SUMMARY:${icsEscape(e.title)}`),
    foldLine(`DESCRIPTION:${icsEscape(calendarDescription(e))}`),
    foldLine(`LOCATION:${icsEscape(location(e))}`),
    foldLine(`URL:${SITE}/event/${e.id}`),
    'STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR',
  );
  return `${lines.join('\r\n')}\r\n`;
}

/** Google Calendar "render?action=TEMPLATE" URL. */
export function googleCalendarUrl(e: CalendarEvent, tz: string): string {
  const t = times(e);
  const dates = t ? `${utcStamp(t.start, tz)}/${utcStamp(t.end, tz)}` : `${basicDate(e.event_date)}/${basicDate(addDays(e.event_date, 1))}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    details: calendarDescription(e),
    location: location(e),
    ctz: tz,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
