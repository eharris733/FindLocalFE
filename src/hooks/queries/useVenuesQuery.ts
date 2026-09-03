import { useQuery } from '@tanstack/react-query';
import { getVenuesByCity } from '../../api/venues';
import { getFeedPreload } from '../../utils/feedPreload';

export function useVenuesQuery(city: string | undefined) {
  return useQuery({
    queryKey: ['venues', city],
    queryFn: () => getVenuesByCity(city!),
    enabled: !!city,
    // The homepage function inlines the venues referenced by its first-screen
    // events; using them as placeholder data lets those cards show venue names
    // on React's first commit. Replaced by the full city list when it lands.
    placeholderData: () => getFeedPreload(city)?.venues,
  });
}
