import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList, EmptyState } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import { useUserRsvpsQuery } from '../../../hooks/queries/useUserRsvpsQuery';

interface YourRsvpsSectionProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

export const YourRsvpsSection: React.FC<YourRsvpsSectionProps> = ({
  events,
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: rsvps, isLoading } = useUserRsvpsQuery();

  // Only show events where user has RSVPed (not events they created invitations for)
  const yourPlanEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    if (!rsvps || rsvps.length === 0) return [];

    const eventIdsSet = new Set(rsvps.map(r => r.event_id));

    return events
      .filter(e => eventIdsSet.has(e.id) && e.event_date && e.event_date >= today)
      .sort((a, b) => {
        const dateA = a.event_date || '';
        const dateB = b.event_date || '';
        return dateA.localeCompare(dateB);
      });
  }, [events, rsvps]);

  const handleDiscoverPress = () => {
    router.push('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title="Your Plans"
        emoji="📅"
        onSeeAll={yourPlanEvents.length > 0 ? onSeeAll : undefined}
        count={yourPlanEvents.length}
      />
      {!isLoading && yourPlanEvents.length === 0 ? (
        <EmptyState
          icon="📭"
          message="No upcoming plans yet"
          ctaLabel="Discover events"
          onCtaPress={handleDiscoverPress}
        />
      ) : (
        <HorizontalEventList
          events={yourPlanEvents}
          onEventPress={onEventPress}
          loading={isLoading}
          venues={venues}
          communities={communities}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
});
