import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import TopNavigation from './TopNavigation';
import FilterBar from './FilterBar';
import SidebarEventList from './SidebarEventList';
import MapPanel from './MapPanel';
import type { Event } from '../types/events';
import type { FilterState, FilterAction } from '../hooks/useEvents';

interface MainLayoutProps {
  events: Event[];
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
  onEventPress: (event: Event) => void;
}

export default function MainLayout({
  events,
  filters,
  dispatchFilters,
  availableCategories,
  availableLocations,
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
        />
        
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {activeTab === 'list' ? (
          <SidebarEventList
            events={events}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
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

  // Desktop/Tablet layout with split view
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
      />
      
      <View style={styles.splitContainer}>
        <View style={[styles.sidebar, { 
          width: sidebarWidth,
          borderRightColor: theme.colors.border.light,
        }]}>
          <SidebarEventList
            events={events}
            onEventPress={onEventPress}
            onEventHover={handleEventHover}
            highlightedEventId={highlightedEventId}
          />
        </View>
        
        <View style={[styles.mapContainer, { width: mapWidth }]}>
          <MapPanel
            events={events}
            onEventPress={onEventPress}
            highlightedEventId={highlightedEventId}
            onMarkerPress={handleMarkerPress}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  mapContainer: {
    flex: 1,
  },
});