import { useQuery } from '@tanstack/react-query';
import { getCommunitiesForCity, getAllLabelsForCity } from '../../api/communities';

export function useCommunitiesQuery(city: string | undefined) {
  return useQuery({
    queryKey: ['communities', city],
    queryFn: () => getCommunitiesForCity(city!),
    enabled: !!city,
  });
}

export function useLabelsQuery(city: string | undefined, communityIds?: string[]) {
  return useQuery({
    queryKey: ['labels', city, communityIds],
    queryFn: () => getAllLabelsForCity(city!, communityIds),
    enabled: !!city,
  });
}
