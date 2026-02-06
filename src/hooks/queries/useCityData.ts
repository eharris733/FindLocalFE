import { useMemo } from 'react';
import { useVenuesQuery } from './useVenuesQuery';
import { useEventsQuery } from './useEventsQuery';
import { useCommunitiesQuery } from './useCommunitiesQuery';

export function useCityData(city: string | undefined) {
  const venuesQuery = useVenuesQuery(city);
  const eventsQuery = useEventsQuery(city);
  const communitiesQuery = useCommunitiesQuery(city);

  // All queries must succeed for data to be "ready"
  const isLoading = venuesQuery.isLoading || eventsQuery.isLoading || communitiesQuery.isLoading;
  const isError = venuesQuery.isError || eventsQuery.isError || communitiesQuery.isError;
  const isReady = !isLoading && !isError && !!city;

  // Memoize arrays to prevent creating new references on every render
  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const communities = useMemo(() => communitiesQuery.data ?? [], [communitiesQuery.data]);

  return {
    venues,
    events,
    communities,
    isLoading,
    isError,
    isReady,
    // Expose individual loading states if needed
    venuesLoading: venuesQuery.isLoading,
    eventsLoading: eventsQuery.isLoading,
    communitiesLoading: communitiesQuery.isLoading,
  };
}
