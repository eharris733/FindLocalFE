import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import TopNavigation from './TopNavigation';
import TabNavigation from './TabNavigation';
import FilterBar from './FilterBar';
import SidebarEventList from './SidebarEventList';
import MapPanel from './MapPanel';
import type { Event } from '../types/events';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';

interface MainLayoutProps {
  events: Event[];
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
  venues: Venue[];
  venuesLoading: boolean;
  onEventPress: (event: Event) => void;
}

export default function MainLayout({
  events,
  filters,
  dispatchFilters,
  availableCategories,
  availableLocations,
  venues,
  venuesLoading,
  onEventPress,
}: MainLayoutProps) {
  const { theme } = useTheme();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>();

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const handleEventHover = (event: Event | null) => {
    if (Platform.OS === 'web' && !isMobile) {
      setHighlightedEventId(event?.id);
    }
  };

  const handleMarkerPress = (event: Event) => {
    if (!isMobile) {
      setHighlightedEventId(event.id);
    }
  };

  const handleNavLinkPress = (link: string) => {
    // Handle navigation link presses
    console.log('Nav link pressed:', link);
    // TODO: Implement navigation logic
  };

  const handleViewModeChange = (mode: 'list' | 'map') => {
    setActiveTab(mode);
  };

  if (isMobile) {
    // Mobile layout with tabs
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <TopNavigation onNavLinkPress={handleNavLinkPress} />
        
        <FilterBar
          filters={filters}
          dispatchFilters={dispatchFilters}
          availableCategories={availableCategories}
          availableLocations={availableLocations}
          venues={venues}
          venuesLoading={venuesLoading}
          viewMode={activeTab}
          onViewModeChange={handleViewModeChange}
          resultsCount={events.length}
        />
        
        {activeTab === 'list' ? (
          <SidebarEventList
            events={events}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
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
      </View>
    );
  }

  // Desktop/Tablet layout with split view or single view based on toggle
  const sidebarWidth = isTablet ? '45%' : '40%';
  const mapWidth = isTablet ? '55%' : '60%';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <TopNavigation onNavLinkPress={handleNavLinkPress} />
      
      <FilterBar
        filters={filters}
        dispatchFilters={dispatchFilters}
        availableCategories={availableCategories}
        availableLocations={availableLocations}
        venues={venues}
        venuesLoading={venuesLoading}
        viewMode={activeTab}
        onViewModeChange={handleViewModeChange}
        resultsCount={events.length}
      />
      
      {activeTab === 'list' ? (
        <View style={styles.fullContainer}>
          <SidebarEventList
            events={events}
            onEventPress={onEventPress}
            onEventHover={handleEventHover}
            highlightedEventId={highlightedEventId}
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