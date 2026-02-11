import { useQuery } from '@tanstack/react-query';
import { getAlreadyInvitedFriendIds } from '../../api/invitations';
import { useAuth } from '../useAuth';

export function useAlreadyInvitedQuery(eventId: string) {
  const { isLoggedIn } = useAuth();

  return useQuery({
    queryKey: ['alreadyInvitedFriends', eventId],
    queryFn: async () => {
      const { data, error } = await getAlreadyInvitedFriendIds(eventId);
      if (error) throw error;
      return new Set(data);
    },
    enabled: isLoggedIn && !!eventId,
  });
}
