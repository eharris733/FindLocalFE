import { useQuery } from '@tanstack/react-query';
import { getSuggestedEventsForUser } from '../../api/trending';
import { useAuth } from '../useAuth';
import { useFavorites } from '../../context/FavoritesContext';

export function useSuggestedEventsQuery(city: string | undefined, limit?: number) {
  const { isLoggedIn, session } = useAuth();
  const { favoriteEventIds } = useFavorites();

  return useQuery({
    queryKey: ['suggestedEvents', city, session?.user?.id, favoriteEventIds.length],
    queryFn: () => getSuggestedEventsForUser(
      session?.user?.id!,
      city!,
      favoriteEventIds,
      limit
    ),
    enabled: !!city && isLoggedIn && !!session?.user?.id,
    select: (result) => result.data,
  });
}
