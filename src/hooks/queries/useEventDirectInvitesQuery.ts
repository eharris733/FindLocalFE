import { useQuery } from '@tanstack/react-query';
import { getDirectInvitesForEvent } from '../../api/invitations';
import { useAuth } from '../useAuth';

export function useEventDirectInvitesQuery(eventId: string | undefined) {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['eventDirectInvites', eventId, session?.user?.id],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await getDirectInvitesForEvent(eventId);
      if (error) throw error;
      return data;
    },
    enabled: isLoggedIn && !!session?.user?.id && !!eventId,
  });
}
