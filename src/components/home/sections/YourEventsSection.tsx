import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, EmptyState } from '../shared';
import EventCard from '../../EventCard';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { getMyInvitations, EventInvitation } from '../../../api/invitations';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../supabase';

interface YourEventsSectionProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

interface InviteEventData {
  event: Event;
  invitations: EventInvitation[];
  stats: { going: number; maybe: number; no: number };
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

  // Get user's created invitations with RSVP stats
  const { data: inviteEventsData, isLoading } = useQuery({
    queryKey: ['myInvitationsWithStats', session?.user?.id],
    queryFn: async (): Promise<InviteEventData[]> => {
      const result = await getMyInvitations();
      if (!result.data || result.data.length === 0) return [];

      // Group invitations by event
      const eventInvitationsMap = new Map<string, EventInvitation[]>();
      result.data.forEach(inv => {
        const existing = eventInvitationsMap.get(inv.event_id) || [];
        existing.push(inv);
        eventInvitationsMap.set(inv.event_id, existing);
      });

      // Get RSVP stats for all invitations
      const allInvitationIds = result.data.map(inv => inv.id);
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('invitation_id, response')
        .in('invitation_id', allInvitationIds);

      // Calculate stats per event
      const inviteEventsData: InviteEventData[] = [];
      for (const [eventId, invitations] of eventInvitationsMap) {
        const event = events.find(e => e.id === eventId);
        if (!event) continue;

        const eventInvitationIds = new Set(invitations.map(inv => inv.id));
        const eventRsvps = (rsvps || []).filter(r => eventInvitationIds.has(r.invitation_id));

        const stats = {
          going: eventRsvps.filter(r => r.response === 'yes').length,
          maybe: eventRsvps.filter(r => r.response === 'maybe').length,
          no: eventRsvps.filter(r => r.response === 'no').length,
        };

        inviteEventsData.push({ event, invitations, stats });
      }

      // Sort by event date
      inviteEventsData.sort((a, b) => {
        const dateA = a.event.event_date || '';
        const dateB = b.event.event_date || '';
        return dateA.localeCompare(dateB);
      });

      return inviteEventsData;
    },
    enabled: isLoggedIn && !!session?.user?.id,
  });

  // Don't render if user has no invites
  if (!isLoading && (!inviteEventsData || inviteEventsData.length === 0)) {
    return null;
  }

  const renderItem = ({ item }: { item: InviteEventData }) => (
    <View style={styles.cardContainer}>
      {/* Stats badge showing RSVP counts */}
      <View style={[styles.statsBadge, { backgroundColor: theme.colors.background.secondary }]}>
        <View style={styles.statsRow}>
          <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '600' }}>
            {item.stats.going} going
          </Text>
          {item.stats.maybe > 0 && (
            <Text variant="caption" style={{ color: theme.colors.warning, fontWeight: '600', marginLeft: 8 }}>
              {item.stats.maybe} maybe
            </Text>
          )}
        </View>
        <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
          {item.invitations.length} invite{item.invitations.length !== 1 ? 's' : ''}
        </Text>
      </View>
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
        title="Your Invites"
        emoji="📨"
        onSeeAll={onSeeAll}
        count={inviteEventsData?.length || 0}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[600]} />
        </View>
      ) : inviteEventsData && inviteEventsData.length > 0 ? (
        <FlatList
          data={inviteEventsData}
          keyExtractor={(item) => item.event.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      ) : (
        <EmptyState
          icon="📨"
          message="No invites created yet"
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
  statsBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardWrapper: {
    flex: 1,
  },
});
