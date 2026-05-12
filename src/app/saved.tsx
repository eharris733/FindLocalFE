import React, { useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import EventCard from '../components/EventCard';
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useFavorites } from '../context/FavoritesContext';
import { useVenuesQuery } from '../hooks/queries/useVenuesQuery';
import { useCityLocation } from '../context/CityContext';
import { getEventsByIds } from '../api/events';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

export default function SavedRoute() {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const router = useRouter();
  const { favoriteEventIds, loading: favoritesLoading } = useFavorites();
  const { selectedCity } = useCityLocation();

  // Sort IDs so the query key is stable regardless of toggle order.
  const sortedIds = useMemo(() => [...favoriteEventIds].sort(), [favoriteEventIds]);

  const { data: savedEventsRaw = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['saved-events', sortedIds],
    queryFn: () => getEventsByIds(sortedIds),
    enabled: sortedIds.length > 0,
  });

  // Venue lookup uses the current city; events from other cities will
  // fall back to event-level location info in the card.
  const { data: venues = [] } = useVenuesQuery(selectedCity);

  const venueById = useMemo(() => {
    const map = new Map<string, Venue>();
    for (const v of venues) map.set(v.id, v);
    return map;
  }, [venues]);

  const savedEvents = useMemo(
    () => savedEventsRaw.filter((e) => favoriteEventIds.includes(e.id)),
    [savedEventsRaw, favoriteEventIds]
  );

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard
        event={item}
        venue={item.venue_id ? venueById.get(item.venue_id) : null}
        onPress={() => router.push(`/event/${item.id}`)}
      />
    ),
    [venueById, router]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <FlatList
        data={savedEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          isDesktop && styles.listDesktop,
        ]}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text
              variant="h2"
              style={{
                color: theme.colors.text.primary,
                fontFamily: theme.typography.fontFamily.headingBold,
              }}
            >
              Saved
            </Text>
            <Text variant="body2" color="secondary" style={{ marginTop: 4 }}>
              {savedEvents.length} {savedEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          favoritesLoading || eventsLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text variant="h4" align="center" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
                No saved events yet
              </Text>
              <Text variant="body2" color="secondary" align="center">
                Tap the heart on any event to save it here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 96,
  },
  listDesktop: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  headerSection: {
    marginBottom: 16,
  },
  empty: {
    paddingVertical: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
