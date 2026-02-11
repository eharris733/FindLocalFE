import { useQuery } from '@tanstack/react-query';
import { getMyCreatedEvents } from '../../api/events';
import { useAuth } from '../useAuth';
import type { Event } from '../../types/events';

export function useMyCreatedEventsQuery() {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['myCreatedEvents', session?.user?.id],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await getMyCreatedEvents();
      if (error) throw new Error(error);
      return data;
    },
    enabled: isLoggedIn && !!session?.user?.id,
  });
}
