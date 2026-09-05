// Pure string date math. event_date is a plain 'YYYY-MM-DD' calendar day, so
// nothing here ever builds a local-time Date from it; "today" is resolved in
// the city's IANA time zone via Intl.

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isYmd(s: unknown): s is string {
  return typeof s === 'string' && YMD.test(s);
}

/** 'YYYY-MM-DD' for `now` as seen on the wall clock in `tz`. */
export function todayIn(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toUtcDate(ymd: string): Date {
  const m = YMD.exec(ymd);
  if (!m) throw new Error(`addDays: expected YYYY-MM-DD, got ${ymd}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: string, n: number): string {
  const d = toUtcDate(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtcDate(d);
}

/** 0 = Sunday ... 6 = Saturday, for a plain calendar day. */
export function dayOfWeek(ymd: string): number {
  return toUtcDate(ymd).getUTCDay();
}

export type When = 'anytime' | 'today' | 'tomorrow' | 'weekend' | 'week' | string;

/**
 * Inclusive calendar-day range for a `when` bucket, resolved in `tz`.
 * weekend = the upcoming Fri..Sun (if today is Sat/Sun: today..Sun);
 * week = today..+6; a literal 'YYYY-MM-DD' = that single day; anything else = anytime.
 */
export function dateRangeFor(when: When, tz: string, now: Date = new Date()): { from: string; to: string | null } {
  const today = todayIn(tz, now);
  switch (when) {
    case 'today':
      return { from: today, to: today };
    case 'tomorrow': {
      const t = addDays(today, 1);
      return { from: t, to: t };
    }
    case 'weekend': {
      const dow = dayOfWeek(today);
      if (dow === 0) return { from: today, to: today };
      if (dow === 6) return { from: today, to: addDays(today, 1) };
      const fri = addDays(today, 5 - dow);
      return { from: fri, to: addDays(fri, 2) };
    }
    case 'week':
      return { from: today, to: addDays(today, 6) };
    default:
      if (isYmd(when)) return { from: when, to: when };
      return { from: today, to: null };
  }
}

export interface FormatEventDateOptions extends Intl.DateTimeFormatOptions {
  /** Return 'Today' / 'Tomorrow' when the day matches the wall clock in `tz`. */
  relative?: boolean;
  now?: Date;
}

/** Format a plain calendar day. Default 'Fri, Sep 4'; pass Intl options to change. */
export function formatEventDate(ymd: string, tz: string, opts: FormatEventDateOptions = {}): string {
  if (!isYmd(ymd)) return '';
  const { relative, now, ...intl } = opts;
  if (relative) {
    const today = todayIn(tz, now);
    if (ymd === today) return 'Today';
    if (ymd === addDays(today, 1)) return 'Tomorrow';
  }
  const options: Intl.DateTimeFormatOptions =
    Object.keys(intl).length > 0 ? intl : { weekday: 'short', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(toUtcDate(ymd));
}

/** '19:30' | '19:30:00' -> '7:30 PM'; null/unparseable -> ''. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return '';
  const h24 = Number(m[1]);
  if (h24 > 23) return '';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m[2]} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export const TIME_OF_DAY: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

/** morning 05:00-11:59, afternoon 12:00-16:59, evening 17:00-04:59; null when no parseable time. */
export function timeOfDayBucket(startTime: string | null | undefined): TimeOfDay | null {
  if (!startTime) return null;
  const m = /^(\d{1,2}):/.exec(startTime.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  if (hour > 23) return null;
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}
