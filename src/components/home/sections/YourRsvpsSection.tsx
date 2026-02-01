import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList, EmptyState } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../hooks/useAuth';
import { useUserRsvpsQuery } from '../../../hooks/queries/useUserRsvpsQuery';
import { getMyInvitations } from '../../../api/invitations';

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
  const { isLoggedIn, session } = useAuth();
  const { data: rsvps, isLoading: rsvpsLoading } = useUserRsvpsQuery();

  // Get user's created invitations to include those events in "Your Plans"
  const { data: myInvitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['myInvitations', session?.user?.id],
    queryFn: async () => {
      const result = await getMyInvitations();
      return result.data;
    },
    enabled: isLoggedIn && !!session?.user?.id,
  });

  const isLoading = rsvpsLoading || invitationsLoading;

  // Combine events where user has RSVPed OR created invitations
  const yourPlanEvents = useMemo(() => {
    const eventIdsSet = new Set<string>();
    const today = new Date().toISOString().split('T')[0];

    // Add events user has RSVPed to
    if (rsvps && rsvps.length > 0) {
      rsvps.forEach(r => eventIdsSet.add(r.event_id));
    }

    // Add events user has created invitations for
    if (myInvitations && myInvitations.length > 0) {
      myInvitations.forEach(inv => eventIdsSet.add(inv.event_id));
    }

    if (eventIdsSet.size === 0) return [];

    return events
      .filter(e => eventIdsSet.has(e.id) && e.event_date && e.event_date >= today)
      .sort((a, b) => {
        const dateA = a.event_date || '';
        const dateB = b.event_date || '';
        return dateA.localeCompare(dateB);
      });
  }, [events, rsvps, myInvitations]);

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
