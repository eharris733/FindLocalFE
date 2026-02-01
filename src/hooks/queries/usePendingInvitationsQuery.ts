import { useQuery } from '@tanstack/react-query';
import { getPendingInvitationsToUser } from '../../api/invitations';
import { useAuth } from '../useAuth';

export function usePendingInvitationsQuery() {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['pendingInvitations', session?.user?.id],
    queryFn: getPendingInvitationsToUser,
    enabled: isLoggedIn && !!session?.user?.id,
    select: (result) => result.data,
  });
}
