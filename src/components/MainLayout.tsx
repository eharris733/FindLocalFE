import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import FilterBar from './FilterBar';
import GalleryView from './GalleryView';
import VenueGroupedListView from './VenueGroupedListView';
import MapPanel from './MapPanel';
import VenueModal from './VenueModal';
import type { Event } from '../types/events';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';
import { useDeviceInfo } from "../hooks/useDeviceInfo";

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
    eventTypes: string[];
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
}: MainLayoutProps) {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();
  const [activeTab, setActiveTab] = useState<'gallery' | 'list' | 'map'>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);

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

  if (isMobile) {
    // Mobile layout with tabs
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>

        <FilterBar
          filters={filters}
          dispatchFilters={dispatchFilters}
          availableFilterOptions={availableFilterOptions}
          viewMode={activeTab}
          onViewModeChange={handleViewModeChange}
          resultsCount={events.length}
          loading={loading}
        />
        
        {activeTab === 'gallery' ? (
          <GalleryView
            events={events}
            loading={loading}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
            venues={venues}
          />
        ) : activeTab === 'list' ? (
          <VenueGroupedListView
            events={events}
            loading={loading}
            venuesLoading={venuesLoading}
            onEventPress={onEventPress}
            onVenuePress={handleVenuePress}
            venues={venues}
          />
        ) : (
          <MapPanel
            events={events}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
            onMarkerPress={handleMarkerPress}
          />
        )}

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

      <FilterBar
        filters={filters}
        dispatchFilters={dispatchFilters}
        availableFilterOptions={availableFilterOptions}
        viewMode={activeTab}
        onViewModeChange={handleViewModeChange}
        resultsCount={events.length}
        loading={loading}
      />
      
      {activeTab === 'gallery' ? (
        <View style={styles.fullContainer}>
          <GalleryView
            events={events}
            loading={loading}
            onEventPress={onEventPress}
            onEventHover={handleEventHover}
            highlightedEventId={highlightedEventId}
            venues={venues}
          />
        </View>
      ) : activeTab === 'list' ? (
        <View style={styles.fullContainer}>
          <VenueGroupedListView
            events={events}
            loading={loading}
            venuesLoading={venuesLoading}
            onEventPress={onEventPress}
            onVenuePress={handleVenuePress}
            venues={venues}
          />
        </View>
      ) : (
        <View style={styles.fullContainer}>
          <MapPanel
            events={events}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
            onMarkerPress={handleMarkerPress}
          />
        </View>
      )}

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