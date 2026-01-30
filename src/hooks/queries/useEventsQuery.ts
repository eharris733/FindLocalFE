import { useQuery } from '@tanstack/react-query';
import { getEventsWithCommunities } from '../../api/events';

export function useEventsQuery(city: string | undefined) {
  return useQuery({
    queryKey: ['events', city],
    queryFn: () => getEventsWithCommunities(city!),
    enabled: !!city,
  });
}
