import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import FilterBar from './FilterBar';
import FeedbackBanner from './FeedbackBanner';
import OnboardingModal from './OnboardingModal';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { useAuth } from '../hooks/useAuth';
import { updateInterests } from '../api/profiles';
import { logger } from '../utils/logger';
import GalleryView from './GalleryView';
import VenueGroupedListView from './VenueGroupedListView';
import MapPanel from './MapPanel';
import VenueModal from './VenueModal';
import type { Event } from '../types/events';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';
import { useDeviceInfo } from "../hooks/useDeviceInfo";
import { useScrollAnimation } from '../hooks/useScrollAnimation';

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
  onFeedbackPress?: () => void;
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
  onFeedbackPress,
}: Readonly<MainLayoutProps>) {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'gallery' | 'list' | 'map'>('list');
  const [highlightedEventId, setHighlightedEventId] = useState<string | undefined>();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        // Don't show onboarding if already completed OR if user is logged in
        // (logged in users have already completed onboarding via OAuth or signup)
        if (!completed && !session) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    checkOnboarding();
  }, [session]); // Re-check when session changes

  const handleOnboardingComplete = useCallback(async (selectedInterests?: string[]) => {
    try {
      // Save onboarding completion status
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      
      // Save interests locally
      if (selectedInterests && selectedInterests.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_INTERESTS, JSON.stringify(selectedInterests));
      }
      
      // Save interests to profile if user is logged in
      if (session?.user?.id && selectedInterests && selectedInterests.length > 0) {
        const { error } = await updateInterests(session.user.id, selectedInterests);
        if (error) {
          logger.error('Error saving interests to profile:', error);
        }
      }
      
      setShowOnboarding(false);
    } catch (error) {
      logger.error('Error saving onboarding data:', error);
      // Still close the modal even if save fails
      setShowOnboarding(false);
    }
  }, [session]);

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

  if (isMobile) {
    // Mobile layout with tabs
    return (
      
      <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        {/* Absolutely positioned filter bar and feedback banner */}
        <View style={styles.filterBarContainer}>
          {onFeedbackPress && <FeedbackBanner onFeedbackPress={onFeedbackPress} />}
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
        <View style={styles.contentContainer}>
          {activeTab === 'gallery' ? (
            <GalleryView
              events={events}
              loading={loading}
              onEventPress={onEventPress}
              highlightedEventId={highlightedEventId}
              venues={venues}
              onScroll={handleScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentInsetTop={filterBarHeight}
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
              contentInsetTop={filterBarHeight}
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

        <OnboardingModal
          visible={showOnboarding}
          onComplete={handleOnboardingComplete}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      {/* Absolutely positioned filter bar and feedback banner */}
      <View style={styles.filterBarContainer}>
        {onFeedbackPress && <FeedbackBanner onFeedbackPress={onFeedbackPress} />}
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
      <View style={styles.contentContainer}>
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
            contentInsetTop={filterBarHeight}
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
            contentInsetTop={filterBarHeight}
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

      <OnboardingModal
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
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