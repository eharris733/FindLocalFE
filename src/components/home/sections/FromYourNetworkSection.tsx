import React from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { NetworkEventActivity } from '../../../api/events';
import EventCard from '../../EventCard';
import { SectionHeader, EmptyState } from '../shared';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useNetworkEventsQuery } from '../../../hooks/queries/useNetworkEventsQuery';

interface FromYourNetworkSectionProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

const SourceBadge: React.FC<{
  activity: NetworkEventActivity;
}> = ({ activity }) => {
  const { theme } = useTheme();

  const getSourceEmoji = () => {
    switch (activity.source_type) {
      case 'followed_venue':
        return '📍';
      case 'followed_creator':
        return '✨';
      case 'friend_attending':
        return '👋';
      default:
        return '🔗';
    }
  };

  const getSourceLabel = () => {
    switch (activity.source_type) {
      case 'followed_venue':
        return `At ${activity.source_name}`;
      case 'followed_creator':
        return `Shared by ${activity.source_name}`;
      case 'friend_attending':
        return `${activity.source_name} is going`;
      default:
        return activity.source_name;
    }
  };

  return (
    <View style={[styles.sourceBadge, { backgroundColor: theme.colors.background.secondary }]}>
      <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
        {getSourceEmoji()} {getSourceLabel()}
      </Text>
    </View>
  );
};

export const FromYourNetworkSection: React.FC<FromYourNetworkSectionProps> = ({
  events,
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();
  const { data: networkActivities, isLoading } = useNetworkEventsQuery();

  // Don't render if no network events
  if (!isLoading && (!networkActivities || networkActivities.length === 0)) {
    return null;
  }

  const renderItem = ({ item }: { item: NetworkEventActivity }) => (
    <View style={styles.cardContainer}>
      <SourceBadge activity={item} />
      <View style={styles.cardWrapper}>
        <EventCard
          event={item.event}
          onPress={onEventPress}
          variant="horizontal"
          venues={venues}
          communities={communities}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title="From Your Network"
        emoji="🔗"
        onSeeAll={networkActivities && networkActivities.length > 0 ? onSeeAll : undefined}
        count={networkActivities?.length || 0}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[600]} />
        </View>
      ) : networkActivities && networkActivities.length > 0 ? (
        <FlatList
          data={networkActivities}
          keyExtractor={(item) => `${item.event.id}-${item.source_id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      ) : (
        <EmptyState
          icon="🔗"
          message="Follow venues and creators to see their events here"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardContainer: {
    width: 280,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardWrapper: {
    flex: 1,
  },
});
