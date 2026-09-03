import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  ListRenderItem,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import EventCard from './EventCard';
import EventMap from './EventMapLazy';
import EventCardSkeleton from './EventCardSkeleton';
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
import { buildRecurrenceMap, isRecurringEvent, getSeriesImage } from '../utils/recurrence';
import { distanceKm } from '../constants/cities';
import { removeSsrFeed } from '../utils/feedPreload';
import type { FeedSort } from '../context/CityContext';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

interface EventFeedProps {
  viewMode: 'list' | 'map';
}

const SKELETON_KEYS = ['s0', 's1', 's2', 's3'];

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'soonest', label: 'Soonest' },
  { value: 'nearest', label: 'Nearest' },
];

export const EventFeed: React.FC<EventFeedProps> = ({ viewMode }) => {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const router = useRouter();
  const { selectedCity, userLocation, locationStatus, feedSort, setFeedSort } = useCityLocation();
  const { filters } = useFilters();

  const { data: events = [], isLoading } = useEventsQuery(selectedCity);
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery(selectedCity);

  // The homepage HTML ships a static copy of the first screen (#ssr-feed, from
  // functions/index.ts) so there's something to paint before this bundle runs.
  // Our first commit renders the same rows from window.__FEED_PRELOAD__, so
  // dropping the fragment after commit but before paint is invisible. Runs
  // unconditionally: a fragment for a different city must go too.
  useLayoutEffect(() => {
    removeSsrFeed();
  }, []);

  const venueById = useMemo(() => {
    const map = new Map<string, Venue>();
    for (const v of venues) map.set(v.id, v);
    return map;
  }, [venues]);

  const venueNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of venues) if (v.name) map.set(v.id, v.name);
    return map;
  }, [venues]);

  const filteredEvents = useFilteredEvents(events, filters, venueNames);

  // venue_id → km from the user, once they've shared a location.
  const venueDistances = useMemo(() => {
    const map = new Map<string, number>();
    if (!userLocation) return map;
    for (const v of venues) {
      if (v.latitude != null && v.longitude != null) {
        map.set(v.id, distanceKm(userLocation.latitude, userLocation.longitude, v.latitude, v.longitude));
      }
    }
    return map;
  }, [venues, userLocation]);

  // The API returns date-ascending ("soonest"); "nearest" reorders by venue
  // distance, breaking ties by date so a venue's own events stay chronological.
  // Events at venues without coordinates sink to the bottom rather than hide.
  const sortedEvents = useMemo(() => {
    if (feedSort !== 'nearest' || venueDistances.size === 0) return filteredEvents;
    const dist = (e: Event) =>
      e.venue_id != null ? (venueDistances.get(e.venue_id) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    return [...filteredEvents].sort((a, b) => {
      const d = dist(a) - dist(b);
      if (d !== 0) return d;
      const byDate = (a.event_date ?? '').localeCompare(b.event_date ?? '');
      if (byDate !== 0) return byDate;
      return (a.start_time ?? '').localeCompare(b.start_time ?? '');
    });
  }, [filteredEvents, feedSort, venueDistances]);

  // Built from the unfiltered city feed so sibling dates hidden by filters
  // still count toward a series.
  const recurrenceMap = useMemo(() => buildRecurrenceMap(events), [events]);

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
        isRecurring={isRecurringEvent(item, recurrenceMap)}
        seriesImageUrl={getSeriesImage(item, recurrenceMap)}
        distanceKm={item.venue_id ? venueDistances.get(item.venue_id) : undefined}
      />
    ),
    [venueById, handleEventPress, recurrenceMap, venueDistances]
  );

  // Rendered from the moment a location is requested (not once it resolves),
  // so the row's height is reserved before the feed is pushed down — a
  // late-appearing toggle after the permission prompt was a layout shift.
  const locating = locationStatus === 'locating';
  const sortToggle = locating || userLocation ? (
    <View style={[styles.sortRow, locating && styles.sortRowPending]}>
      <Text variant="label" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
        Sort
      </Text>
      {SORT_OPTIONS.map((opt) => {
        const active = feedSort === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setFeedSort(opt.value)}
            disabled={locating || !userLocation}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: locating || !userLocation }}
            style={[
              styles.sortChip,
              {
                backgroundColor: active ? theme.colors.primary[500] : theme.colors.surface.accent,
                borderColor: active ? theme.colors.primary[500] : theme.colors.border.light,
              },
            ]}
          >
            <Text
              variant="label"
              style={{
                color: active ? theme.colors.text.inverse : theme.colors.text.secondary,
                fontWeight: '600',
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null;

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
      data={sortedEvents}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={sortToggle}
      // Only the first screen needs to mount before paint; the rest streams in
      // as the user scrolls. (removeClippedSubviews is a no-op on web, and
      // getItemLayout can't be used because card height follows width.)
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      updateCellsBatchingPeriod={50}
      contentContainerStyle={[
        styles.listContent,
        isDesktop && styles.listContentDesktop,
      ]}
      ListEmptyComponent={
        isLoading ? (
          <View>
            {SKELETON_KEYS.map((k) => (
              <EventCardSkeleton key={k} />
            ))}
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
  // The FlatList must stretch to the column's full width and center via the
  // content container (like saved.tsx / venues.tsx). Centering with
  // alignItems on this wrapper makes the list shrink-to-fit on web, so its
  // width depends on which virtualized rows are mounted — rows mounting and
  // unmounting then resize the whole feed in a loop (width oscillation).
  feedColumn: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 96,
  },
  listContentDesktop: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sortRowPending: {
    opacity: 0.5,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
});

export default EventFeed;
