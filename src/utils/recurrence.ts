import type { Event } from '../types/events';

/**
 * Recurring-event detection. The events pipeline stores each occurrence as its
 * own events_gold row, so a "recurring" event is simply the same title at the
 * same venue on more than one date (e.g. weekly jazz nights, open mics).
 */

const normalizeTitle = (title: string | null | undefined): string =>
  (title ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const seriesKey = (event: Pick<Event, 'venue_id' | 'title' | 'custom_location'>): string =>
  `${event.venue_id ?? event.custom_location ?? ''}|${normalizeTitle(event.title)}`;

export interface RecurrenceInfo {
  /** Distinct upcoming dates for this series (including the event itself). */
  dateCount: number;
}

/**
 * Builds a lookup of series key → distinct date count from a city's event
 * list. Call with the unfiltered feed so filters don't hide sibling dates.
 */
export const buildRecurrenceMap = (events: Event[]): Map<string, RecurrenceInfo> => {
  const dates = new Map<string, Set<string>>();
  for (const event of events) {
    if (!event.title || !event.event_date) continue;
    const key = seriesKey(event);
    if (!dates.has(key)) dates.set(key, new Set());
    dates.get(key)!.add(event.event_date);
  }
  const map = new Map<string, RecurrenceInfo>();
  for (const [key, set] of dates) {
    map.set(key, { dateCount: set.size });
  }
  return map;
};

export const isRecurringEvent = (
  event: Event,
  recurrenceMap: Map<string, RecurrenceInfo>
): boolean => (recurrenceMap.get(seriesKey(event))?.dateCount ?? 0) > 1;

export const getSeriesKey = seriesKey;
