import { useMemo } from 'react';
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
} from 'date-fns';
import type { Event, FilterState, TimeOfDay } from '../types/events';
import { eventDateToLocalDate } from '../utils/eventDate';

const getDateRange = (
  when: FilterState['when'],
  customDate: Date | null
): { start: Date | null; end: Date | null } => {
  const today = new Date();
  switch (when) {
    case 'anytime':
      return { start: startOfDay(today), end: null };
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    case 'tomorrow': {
      const tomorrow = addDays(today, 1);
      return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
    }
    case 'this_weekend': {
      const sat = addDays(startOfWeek(today, { weekStartsOn: 0 }), 6);
      const sun = addDays(startOfWeek(today, { weekStartsOn: 0 }), 7);
      return { start: startOfDay(sat), end: endOfDay(sun) };
    }
    case 'custom':
      if (customDate) return { start: startOfDay(customDate), end: endOfDay(customDate) };
      return { start: null, end: null };
    default:
      return { start: null, end: null };
  }
};

const getTimeOfDayBucket = (hour: number): TimeOfDay | null => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 || hour < 5) return 'evening';
  return null;
};

// Chip slugs (from FilterControls) → tokens that may appear in events_gold.event_type
// (case-insensitive). Community UUIDs are not listed here because chip values are
// slugs; if the DB later gains a slug column on communities we can match those too.
const CATEGORY_TOKEN_MAP: Record<string, readonly string[]> = {
  music: ['music', 'live music', 'jazz', 'rock', 'pop', 'classical', 'folk', 'alternative', 'hip hop', 'electronic'],
  comedy: ['comedy', 'stand-up', 'improv', 'open mic', 'comedy show'],
  theater: ['theater', 'play', 'performance'],
  art: ['culture', 'art', 'art exhibition', 'gallery talk'],
  food_drink: ['food', 'food & drink', 'drink', 'dining'],
  family: ['family', 'family friendly', 'kids'],
  market: ['market', 'markets'],
  workshop: ['workshop', 'workshops', 'class', 'seminar'],
  fitness: ['fitness', 'yoga', 'wellness'],
  nightlife: ['nightlife', 'club', 'dj'],
  community: ['community', 'community event'],
  festival: ['festival'],
};

const eventHasCategory = (event: Event, chipSlugs: string[]): boolean => {
  if (chipSlugs.length === 0) return true;
  const wanted = new Set(
    chipSlugs.flatMap((slug) => CATEGORY_TOKEN_MAP[slug] ?? [slug.toLowerCase()])
  );
  if (event.event_type?.some((t) => wanted.has(t.toLowerCase()))) return true;
  return false;
};

export const filterEvents = (
  events: Event[],
  filters: FilterState,
  /** venue_id → venue name, so a search can also hit "Paradise Rock Club". */
  venueNames?: ReadonlyMap<string, string>
): Event[] => {
  const { start, end } = getDateRange(filters.when, filters.customDate);
  const query = (filters.query ?? '').trim().toLowerCase();
  const priceMode: 'any' | 'free' | 'paid' | 'either' =
    filters.free && filters.paid ? 'either' :
    filters.free ? 'free' :
    filters.paid ? 'paid' : 'any';

  return events.filter((event) => {
    // Calendar day at local midnight — see utils/eventDate.ts for why the raw
    // timestamp must not be parsed as an instant.
    const eventDate = eventDateToLocalDate(event.event_date);
    if (!eventDate) return false;

    if (start && eventDate < start) return false;
    if (end && eventDate > end) return false;

    if (query) {
      const venueName = event.venue_id ? venueNames?.get(event.venue_id) : undefined;
      const haystack = [event.title, venueName, event.custom_location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.regions.length > 0) {
      if (!event.region || !filters.regions.includes(event.region)) return false;
    }

    if (!eventHasCategory(event, filters.categories)) return false;

    if (priceMode === 'free') {
      if (event.price_amount === null || event.price_amount === undefined || event.price_amount > 0) return false;
    } else if (priceMode === 'paid') {
      if (event.price_amount !== null && event.price_amount !== undefined && event.price_amount === 0) return false;
    }

    if (filters.maxPrice !== null && event.price_amount !== null && event.price_amount !== undefined) {
      if (event.price_amount > filters.maxPrice) return false;
    }

    if (filters.timeOfDay.length > 0 && event.start_time) {
      const match = /^(\d{2}):/.exec(event.start_time);
      if (match) {
        const hour = Number.parseInt(match[1], 10);
        const bucket = getTimeOfDayBucket(hour);
        if (!bucket || !filters.timeOfDay.includes(bucket)) return false;
      }
    }

    return true;
  });
};

export const countActiveFilters = (filters: FilterState): number => {
  let n = 0;
  if ((filters.query ?? '').trim()) n++;
  if (filters.when !== 'anytime') n++;
  if (filters.categories.length > 0) n++;
  if (filters.regions.length > 0) n++;
  if (filters.free || filters.paid) n++;
  if (filters.maxPrice !== null) n++;
  if (filters.timeOfDay.length > 0) n++;
  return n;
};

export const useFilteredEvents = (
  events: Event[],
  filters: FilterState,
  venueNames?: ReadonlyMap<string, string>
): Event[] =>
  useMemo(() => filterEvents(events, filters, venueNames), [events, filters, venueNames]);
