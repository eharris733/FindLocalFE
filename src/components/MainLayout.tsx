import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FilterBar from './FilterBar';
import { SetupScreen } from './SetupScreen';
import GalleryView from './GalleryView';
import VenueGroupedListView from './VenueGroupedListView';
import MapPanel from './MapPanel';
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
  availableCategories,
  availableLocations,
  venues,
  venuesLoading,
  availableFilterOptions,
  onEventPress,
}: Readonly<MainLayoutProps>) {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();
  const { selectedCity } = useCityLocation();
  const [activeTab, setActiveTab] = useState<'gallery' | 'list' | 'map'>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [filterBarHeight, setFilterBarHeight] = useState(0);

  // Hook for scroll animation (only used for list and gallery views)
  const { headerTranslateY, handleScroll, scrollEventThrottle } = useScrollAnimation({
    headerHeight: filterBarHeight,
  });

  const handleEventHover = useCallback((event: Event | null) => {
    if (Platform.OS === 'web' && !isMobile) {
      setHighlightedEventId(event?.id);
    }
  }, [isMobile]);

  const handleMarkerPress = useCallback((event: Event) => {
    if (!isMobile) {
      setHighlightedEventId(event.id);
    }
  }, [isMobile]);

  const handleViewModeChange = useCallback((mode: 'gallery' | 'list' | 'map') => {
    setActiveTab(mode);
  }, []);

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

  // Determine if we should show animated filter bar (list and gallery only, not map)
  const shouldAnimateFilterBar = activeTab === 'list' || activeTab === 'gallery';

  // Calculate total top inset (filter bar height only; header already handles safe area)
  const totalTopInset = filterBarHeight;

  // Show setup screen if city is not set or data is loading
  // This happens after OAuth redirect or when app first loads with saved preferences
  if (!selectedCity || (loading && events.length === 0)) {
    return <SetupScreen />;
  }

  if (isMobile) {
    // Mobile layout with tabs
    return (

      <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        {/* Absolutely positioned filter bar */}
        <View style={styles.filterBarContainer}>
          <FilterBar
            filters={filters}
            dispatchFilters={dispatchFilters}
            availableFilterOptions={availableFilterOptions}
            viewMode={activeTab}
            onViewModeChange={handleViewModeChange}
            resultsCount={events.length}
            loading={loading}
            animatedStyle={shouldAnimateFilterBar ? { transform: [{ translateY: headerTranslateY }] } : undefined}
            onLayout={handleFilterBarLayout}
            pointerEvents="auto"
          />
        </View>

        {/* Content */}
        <View
          style={[
            styles.contentContainer,
            activeTab === 'map' && { paddingTop: totalTopInset },
          ]}
        >
          {activeTab === 'gallery' ? (
            <GalleryView
              events={events}
              loading={loading}
              onEventPress={onEventPress}
              highlightedEventId={highlightedEventId}
              venues={venues}
              onScroll={handleScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentInsetTop={totalTopInset}
            />
          ) : activeTab === 'list' ? (
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
          ) : (
            <MapPanel
              events={events}
              onEventPress={onEventPress}
              highlightedEventId={highlightedEventId}
              onMarkerPress={handleMarkerPress}
            />
          )}
        </View>

        <VenueModal
          visible={showVenueModal}
          venue={selectedVenue}
          onClose={handleCloseVenueModal}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      {/* Absolutely positioned filter bar */}
      <View style={styles.filterBarContainer}>
        <FilterBar
          filters={filters}
          dispatchFilters={dispatchFilters}
          availableFilterOptions={availableFilterOptions}
          viewMode={activeTab}
          onViewModeChange={handleViewModeChange}
          resultsCount={events.length}
          loading={loading}
          animatedStyle={shouldAnimateFilterBar ? { transform: [{ translateY: headerTranslateY }] } : undefined}
          onLayout={handleFilterBarLayout}
          pointerEvents="auto"
        />
      </View>

      {/* Content */}
      <View
        style={[
          styles.contentContainer,
          activeTab === 'map' && { paddingTop: totalTopInset },
        ]}
      >
        {activeTab === 'gallery' ? (
          <GalleryView
            events={events}
            loading={loading}
            onEventPress={onEventPress}
            onEventHover={handleEventHover}
            highlightedEventId={highlightedEventId}
            venues={venues}
            onScroll={handleScroll}
            scrollEventThrottle={scrollEventThrottle}
            contentInsetTop={totalTopInset}
          />
        ) : activeTab === 'list' ? (
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
        ) : (
          <MapPanel
            events={events}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
            onMarkerPress={handleMarkerPress}
          />
        )}
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
    elevation: 10, // Android shadow/elevation
  },
  contentContainer: {
    flex: 1,
  },
  fullContainer: {
    flex: 1,
    overflow: 'visible',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'visible',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  mapContainer: {
    flex: 1,
  },
});
