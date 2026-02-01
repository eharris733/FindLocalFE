import { useQuery } from '@tanstack/react-query';
import { getTrendingEventsByCategory, getPopularEvents, getUpcomingEvents } from '../../api/trending';

export function useTrendingEventsQuery(city: string | undefined) {
  return useQuery({
    queryKey: ['trendingEvents', city],
    queryFn: () => getTrendingEventsByCategory(city!),
    enabled: !!city,
    select: (result) => result.data,
  });
}

export function usePopularEventsQuery(city: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ['popularEvents', city, limit],
    queryFn: () => getPopularEvents(city!, limit),
    enabled: !!city,
    select: (result) => result.data,
  });
}

export function useUpcomingEventsQuery(city: string | undefined, days?: number, limit?: number) {
  return useQuery({
    queryKey: ['upcomingEvents', city, days, limit],
    queryFn: () => getUpcomingEvents(city!, days, limit),
    enabled: !!city,
    select: (result) => result.data,
  });
}
