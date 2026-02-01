import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { getMyInvitations } from '../../../api/invitations';
import { useAuth } from '../../../hooks/useAuth';

interface YourEventsSectionProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

export const YourEventsSection: React.FC<YourEventsSectionProps> = ({
  events,
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();
  const { isLoggedIn, session } = useAuth();

  // Get user's created invitations to identify their events
  const { data: invitations, isLoading } = useQuery({
    queryKey: ['myInvitations', session?.user?.id],
    queryFn: async () => {
      const result = await getMyInvitations();
      return result.data;
    },
    enabled: isLoggedIn && !!session?.user?.id,
  });

  // Filter events to only those where user has created invitations
  const userEvents = useMemo(() => {
    if (!invitations || invitations.length === 0) return [];

    const eventIds = new Set(invitations.map(inv => inv.event_id));
    return events.filter(e => eventIds.has(e.id));
  }, [events, invitations]);

  // Don't render if user has no events
  if (!isLoading && userEvents.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title="Your Events"
        emoji="🎤"
        onSeeAll={onSeeAll}
        count={userEvents.length}
      />
      <HorizontalEventList
        events={userEvents}
        onEventPress={onEventPress}
        loading={isLoading}
        emptyMessage="No events you're hosting"
        emptyIcon="🎤"
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
