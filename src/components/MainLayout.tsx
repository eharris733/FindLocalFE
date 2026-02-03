import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FilterBar from './FilterBar';
import { SetupScreen } from './SetupScreen';
import VenueGroupedListView from './VenueGroupedListView';
import VenueModal from './VenueModal';
import type { Event } from '../types/events';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';
import { useDeviceInfo } from "../hooks/useDeviceInfo";
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useCityLocation } from '../context/CityContext';

interface MainLayoutProps {
  events: Event[];
  loading: boolean;
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
  venues: Venue[];
  venuesLoading: boolean;
  availableFilterOptions: {
    venueTypes: string[];
    sizes: string[];
    regions: string[];
    priceRanges: string[];
    timeRanges: string[];
    communityIds: string[];
    labels: string[];
  };
  onEventPress: (event: Event) => void;
}

export default function MainLayout({
  events,
  loading,
  filters,
  dispatchFilters,
  venues,
  venuesLoading,
  availableFilterOptions,
  onEventPress,
}: Readonly<MainLayoutProps>) {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();
  const { selectedCity } = useCityLocation();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [filterBarHeight, setFilterBarHeight] = useState(0);

  // Hook for scroll animation
  const { headerTranslateY, handleScroll, scrollEventThrottle } = useScrollAnimation({
    headerHeight: filterBarHeight,
  });

  const handleVenuePress = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
    setShowVenueModal(true);
  }, []);

  const handleCloseVenueModal = useCallback(() => {
    setShowVenueModal(false);
    setSelectedVenue(null);
  }, []);

  const handleFilterBarLayout = useCallback((height: number) => {
    setFilterBarHeight(height);
  }, []);

  // Calculate total top inset (filter bar height only; header already handles safe area)
  const totalTopInset = filterBarHeight;

  // Show setup screen if city is not set or data is loading
  if (!selectedCity || (loading && events.length === 0)) {
    return <SetupScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      {/* Absolutely positioned filter bar */}
      <View style={styles.filterBarContainer}>
        <FilterBar
          filters={filters}
          dispatchFilters={dispatchFilters}
          availableFilterOptions={availableFilterOptions}
          resultsCount={events.length}
          loading={loading}
          animatedStyle={{ transform: [{ translateY: headerTranslateY }] }}
          onLayout={handleFilterBarLayout}
          pointerEvents="auto"
        />
      </View>

      {/* Content - Always list view */}
      <View style={styles.contentContainer}>
        <VenueGroupedListView
          events={events}
          loading={loading}
          venuesLoading={venuesLoading}
          onEventPress={onEventPress}
          onVenuePress={handleVenuePress}
          venues={venues}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentInsetTop={totalTopInset}
        />
      </View>

      <VenueModal
        visible={showVenueModal}
        venue={selectedVenue}
        onClose={handleCloseVenueModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible',
  },
  filterBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  contentContainer: {
    flex: 1,
  },
});
