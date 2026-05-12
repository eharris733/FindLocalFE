import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import EventCard from './EventCard';
import EventMap from './EventMap';
import FilterFAB from './FilterFAB';
import FilterSidebar from './FilterSidebar';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useFilteredEvents } from '../hooks/useEvents';
import { useFilters } from '../context/FiltersContext';
import { useCityLocation } from '../context/CityContext';
import { useEventsQuery } from '../hooks/queries/useEventsQuery';
import { useVenuesQuery } from '../hooks/queries/useVenuesQuery';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

interface EventFeedProps {
  viewMode: 'list' | 'map';
}

export const EventFeed: React.FC<EventFeedProps> = ({ viewMode }) => {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const router = useRouter();
  const { selectedCity } = useCityLocation();
  const { filters } = useFilters();

  const { data: events = [], isLoading } = useEventsQuery(selectedCity);
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery(selectedCity);

  const filteredEvents = useFilteredEvents(events, filters);

  const venueById = useMemo(() => {
    const map = new Map<string, Venue>();
    for (const v of venues) map.set(v.id, v);
    return map;
  }, [venues]);

  const handleEventPress = useCallback(
    (event: Event) => router.push(`/event/${event.id}`),
    [router]
  );

  const handleVenuePress = useCallback(
    (venue: Venue) => router.push(`/venue/${venue.id}`),
    [router]
  );

  const renderItem: ListRenderItem<Event> = useCallback(
    ({ item }) => (
      <EventCard
        event={item}
        venue={item.venue_id ? venueById.get(item.venue_id) : null}
        onPress={() => handleEventPress(item)}
      />
    ),
    [venueById, handleEventPress]
  );

  if (viewMode === 'map') {
    return (
      <View style={[styles.container, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        {isDesktop && <FilterSidebar />}
        <View style={styles.mapWrapper}>
          <EventMap
            events={filteredEvents}
            venues={venues}
            venuesLoading={venuesLoading}
            onEventPress={handleEventPress}
            onVenuePress={handleVenuePress}
            selectedCity={selectedCity}
          />
          {!isDesktop && <FilterFAB />}
        </View>
      </View>
    );
  }

  const listContent = (
    <FlatList
      data={filteredEvents}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.listContent,
        isDesktop && styles.listContentDesktop,
      ]}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text variant="h4" align="center" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
              No events match your filters
            </Text>
            <Text variant="body2" color="secondary" align="center">
              Try clearing some filters or picking a different city.
            </Text>
          </View>
        )
      }
    />
  );

  if (isDesktop) {
    return (
      <View style={[styles.container, { flexDirection: 'row' }]}>
        <FilterSidebar />
        <View style={styles.feedColumn}>{listContent}</View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {listContent}
      <FilterFAB />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedColumn: {
    flex: 1,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 96,
  },
  listContentDesktop: {
    width: '100%',
    maxWidth: 720,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  mapWrapper: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 600 : 0,
  },
  empty: {
    paddingVertical: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EventFeed;
