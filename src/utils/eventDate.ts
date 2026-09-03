import { parseISO } from 'date-fns';
import type { Event } from '../types/events';

/**
 * `events_gold.event_date` is a timestamptz, but it *means* a calendar day.
 * The pipeline stamps it inconsistently — some rows are `T00:00:00+00:00`,
 * others `T23:00:00+00:00` — so parsing it as an instant and reading the local
 * date is wrong: a midnight-UTC stamp is the previous evening in US zones,
 * which hid today's events from the feed and labelled them with yesterday's
 * date. The UTC date part is the intended day in every variant, so always go
 * through these helpers instead of `new Date(event_date)` / `parseISO(event_date)`.
 */

/** yyyy-MM-dd calendar day of an event_date string, or null. */
export const eventDay = (eventDate: string | null | undefined): string | null =>
  eventDate ? eventDate.slice(0, 10) : null;

/** Local-midnight Date for a yyyy-MM-dd day (for date-fns formatting / range checks). */
export const dayToDate = (day: string): Date => parseISO(day);

/** Same, straight from an event_date string; null when absent. */
export const eventDateToLocalDate = (eventDate: string | null | undefined): Date | null => {
  const day = eventDay(eventDate);
  return day ? dayToDate(day) : null;
};

/** Today as yyyy-MM-dd in the device's local zone. */
export const localToday = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Feed order: calendar day, then start time (unknown times last), then id for
 * stability. PostgREST can only order by the raw timestamp, which interleaves
 * the two stamp variants within a day, so the client re-sorts after fetching.
 * functions/_feed.ts applies the identical comparator server-side.
 */
export const compareEventsByDayTime = (a: Event, b: Event): number => {
  const day = (eventDay(a.event_date) ?? '').localeCompare(eventDay(b.event_date) ?? '');
  if (day !== 0) return day;
  const time = (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99');
  if (time !== 0) return time;
  return a.id.localeCompare(b.id);
};
