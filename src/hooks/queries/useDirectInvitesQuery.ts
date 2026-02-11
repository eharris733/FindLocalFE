import { useQuery } from '@tanstack/react-query';
import { getPendingDirectInvites } from '../../api/invitations';
import { useAuth } from '../useAuth';

export function useDirectInvitesQuery() {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['directInvites', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await getPendingDirectInvites();
      if (error) throw error;
      return data;
    },
    enabled: isLoggedIn && !!session?.user?.id,
  });
}
