import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList, EmptyState } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import { useFavorites } from '../../../context/FavoritesContext';

interface FavoritesSectionProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  events,
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { favoriteEventIds, loading } = useFavorites();

  // Filter events to only favorites with upcoming dates
  const favoriteEvents = useMemo(() => {
    if (favoriteEventIds.length === 0) return [];

    const today = new Date().toISOString().split('T')[0];
    const favoriteSet = new Set(favoriteEventIds);

    return events
      .filter(e => favoriteSet.has(e.id) && e.event_date && e.event_date >= today)
      .sort((a, b) => {
        const dateA = a.event_date || '';
        const dateB = b.event_date || '';
        return dateA.localeCompare(dateB);
      });
  }, [events, favoriteEventIds]);

  // Don't render if no favorites
  if (!loading && favoriteEvents.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title="Your Favorites"
        emoji="❤️"
        onSeeAll={favoriteEvents.length > 0 ? onSeeAll : undefined}
        count={favoriteEvents.length}
      />
      <HorizontalEventList
        events={favoriteEvents}
        onEventPress={onEventPress}
        loading={loading}
        emptyMessage="No upcoming favorites"
        emptyIcon="❤️"
        venues={venues}
        communities={communities}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
});
