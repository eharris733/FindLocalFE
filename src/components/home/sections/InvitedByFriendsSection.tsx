import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import { usePendingInvitationsQuery } from '../../../hooks/queries/usePendingInvitationsQuery';

interface InvitedByFriendsSectionProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

export const InvitedByFriendsSection: React.FC<InvitedByFriendsSectionProps> = ({
  events,
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();
  const { data: invitations, isLoading } = usePendingInvitationsQuery();

  // Filter events to those with pending invitations
  const invitedEvents = React.useMemo(() => {
    if (!invitations || invitations.length === 0) return [];

    const eventIds = new Set(invitations.map(inv => inv.event_id));
    return events.filter(e => eventIds.has(e.id));
  }, [events, invitations]);

  // Don't render if no pending invitations
  if (!isLoading && invitedEvents.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title="Invited by Friends"
        emoji="💌"
        onSeeAll={onSeeAll}
        count={invitedEvents.length}
      />
      <HorizontalEventList
        events={invitedEvents}
        onEventPress={onEventPress}
        loading={isLoading}
        emptyMessage="No pending invitations"
        emptyIcon="💌"
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
