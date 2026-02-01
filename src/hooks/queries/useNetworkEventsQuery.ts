import { useQuery } from '@tanstack/react-query';
import { getEventsFromNetwork, NetworkEventActivity } from '../../api/events';
import { useAuth } from '../useAuth';

export function useNetworkEventsQuery() {
  const { isLoggedIn, session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['networkEvents', userId],
    queryFn: async (): Promise<NetworkEventActivity[]> => {
      if (!userId) return [];
      return getEventsFromNetwork(userId);
    },
    enabled: isLoggedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
