import React from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import EventCard from '../../EventCard';
import { EmptyState } from './EmptyState';
import { useTheme } from '../../../context/ThemeContext';

interface HorizontalEventListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  venues?: Venue[];
  communities?: Community[];
}

export const HorizontalEventList: React.FC<HorizontalEventListProps> = ({
  events,
  onEventPress,
  loading = false,
  emptyMessage = 'No events to show',
  emptyIcon = '📭',
  venues,
  communities,
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary[600]} />
      </View>
    );
  }

  if (events.length === 0) {
    return <EmptyState icon={emptyIcon} message={emptyMessage} />;
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <EventCard
            event={item}
            onPress={onEventPress}
            variant="horizontal"
            venues={venues}
            communities={communities}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 280,
  },
});
