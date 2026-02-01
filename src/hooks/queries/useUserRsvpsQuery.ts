import { useQuery } from '@tanstack/react-query';
import { getUserUpcomingRsvps } from '../../api/invitations';
import { useAuth } from '../useAuth';

export function useUserRsvpsQuery() {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['userRsvps', session?.user?.id],
    queryFn: getUserUpcomingRsvps,
    enabled: isLoggedIn && !!session?.user?.id,
    select: (result) => result.data,
  });
}
