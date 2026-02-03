import React from 'react';
import { useCityLocation } from '../context/CityContext';
import { useCommunity } from '../context/CommunityContext';
import { useFavorites } from '../context/FavoritesContext';
import { useEvents } from '../hooks/useEvents';
import { useCommunitiesQuery } from '../hooks/queries/useCommunitiesQuery';
import { logger } from '../utils/logger';
import MainLayout from './MainLayout';
import type { Event } from '../types/events';

interface DiscoverPageContentProps {
  onEventPress: (event: Event) => void;
  initialViewMode?: 'list' | 'map';
}

export function DiscoverPageContent({ onEventPress, initialViewMode = 'list' }: DiscoverPageContentProps) {
  const { selectedCity, selectedRegions } = useCityLocation();
  const { selectedCommunities } = useCommunity();
  const { data: communitiesData } = useCommunitiesQuery(selectedCity);
  const { favoriteEventIds } = useFavorites();

  // Stabilize allCommunities reference to prevent infinite re-renders
  const allCommunities = React.useMemo(() => communitiesData ?? [], [communitiesData]);

  const {
    loading,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
    venues,
    venuesLoading,
    availableFilterOptions,
  } = useEvents({ selectedCity, favoriteEventIds });

  // Sync selectedRegions from CityContext to filters
  React.useEffect(() => {
    dispatchFilters({ type: 'SET_REGIONS', payload: selectedRegions });
  }, [selectedRegions, dispatchFilters]);

  // Sync selected communities to filters
  React.useEffect(() => {
    logger.info('🎭 Selected communities changed in index:', selectedCommunities);

    // Convert community names to IDs
    if (selectedCommunities.length === 0) {
      // If no communities selected, show all (empty filter)
      dispatchFilters({ type: 'SET_COMMUNITY_IDS', payload: [] });
    } else {
      const communityIds = selectedCommunities
        .map(name => allCommunities.find(c => c.name === name)?.id)
        .filter(Boolean) as string[];

      logger.info('🎭 Setting community IDs filter:', communityIds);
      dispatchFilters({ type: 'SET_COMMUNITY_IDS', payload: communityIds });
    }
  }, [selectedCommunities, allCommunities, dispatchFilters]);

  return (
    <MainLayout
      events={filteredEvents}
      loading={loading}
      filters={filters}
      dispatchFilters={dispatchFilters}
      availableCategories={availableCategories}
      availableLocations={availableLocations}
      venues={venues}
      venuesLoading={venuesLoading}
      availableFilterOptions={availableFilterOptions}
      onEventPress={onEventPress}
      initialViewMode={initialViewMode}
    />
  );
}
