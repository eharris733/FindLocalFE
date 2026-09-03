import { useEffect } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import {
  getEventsPage,
  FEED_FIRST_PAGE_SIZE,
  FEED_PAGE_SIZE,
  type EventsPage,
} from '../../api/events';
import type { Event } from '../../types/events';
import { getFeedPreload } from '../../utils/feedPreload';
import { compareEventsByDayTime } from '../../utils/eventDate';

/**
 * City feed as a flat `Event[]`, loaded progressively.
 *
 * Page 1 is small (FEED_FIRST_PAGE_SIZE rows) so the first cards render as
 * soon as it lands; the remaining pages (FEED_PAGE_SIZE each) are fetched
 * automatically afterwards and appended below the fold. Consumers keep the
 * `useQuery` shape they always had — `{ data: Event[], isLoading }` — and
 * `isLoading` clears after page 1. The full list still arrives (the
 * recurrence map, availability-aware filter chips and the filter match count
 * all rely on it); it just no longer blocks first paint.
 */
export function useEventsQuery(city: string | undefined) {
  const query = useInfiniteQuery<EventsPage, Error, Event[], readonly unknown[], number>({
    queryKey: ['events', city],
    enabled: !!city,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const size = pageParam === 0 ? FEED_FIRST_PAGE_SIZE : FEED_PAGE_SIZE;
      return getEventsPage(city!, pageParam, pageParam + size - 1, pageParam === 0);
    },
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      const total = pages[0]?.total;
      if (total != null) return loaded < total ? loaded : undefined;
      // No count available: keep going while pages come back full.
      const expected = pages.length === 1 ? FEED_FIRST_PAGE_SIZE : FEED_PAGE_SIZE;
      return lastPage.rows.length >= expected ? loaded : undefined;
    },
    // PostgREST orders by the raw timestamp, which interleaves the T00:00Z and
    // T23:00Z stamp variants within a day; re-sort by calendar day + start time.
    select: (data: InfiniteData<EventsPage, number>) =>
      data.pages.flatMap((p) => p.rows).sort(compareEventsByDayTime),
    // First paint from the server-inlined rows (see utils/feedPreload.ts) while
    // page 1 is in flight. Placeholder data is never written to the cache, so
    // the real fetch still runs immediately and the auto-drain below waits for it.
    placeholderData: () => {
      const preload = getFeedPreload(city);
      if (!preload) return undefined;
      const data: InfiniteData<EventsPage, number> = {
        pages: [{ rows: preload.events, total: null }],
        pageParams: [0],
      };
      return data;
    },
  });

  const { hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage, data } = query;

  // Drain the remaining pages as soon as the previous one lands. Several
  // components mount this hook at once; `cancelRefetch: false` makes the
  // duplicate calls join the in-flight request instead of restarting it.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isPlaceholderData) {
      fetchNextPage({ cancelRefetch: false });
    }
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage, data]);

  return query;
}
