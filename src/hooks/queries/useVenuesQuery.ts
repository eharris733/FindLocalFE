import { useQuery } from '@tanstack/react-query';
import { getVenuesByCity } from '../../api/venues';

export function useVenuesQuery(city: string | undefined) {
  return useQuery({
    queryKey: ['venues', city],
    queryFn: () => getVenuesByCity(city!),
    enabled: !!city,
  });
}
