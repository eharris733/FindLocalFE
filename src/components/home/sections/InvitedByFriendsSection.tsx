import React from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, EmptyState } from '../shared';
import EventCard from '../../EventCard';
import { UserAvatar } from '../../UserAvatar';
import { Text } from '../../ui';
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

  // Build a map of event_id -> inviter info
  const inviterMap = React.useMemo(() => {
    if (!invitations) return new Map<string, { name: string; avatar?: string | null }>();
    const map = new Map<string, { name: string; avatar?: string | null }>();
    for (const inv of invitations) {
      if (!map.has(inv.event_id)) {
        map.set(inv.event_id, {
          name: inv.inviter_username ? `@${inv.inviter_username}` : inv.inviter_name || 'A friend',
          avatar: inv.inviter_avatar,
        });
      }
    }
    return map;
  }, [invitations]);

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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[600]} />
        </View>
      ) : invitedEvents.length === 0 ? (
        <EmptyState icon="💌" message="No pending invitations" />
      ) : (
        <FlatList
          data={invitedEvents}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const inviter = inviterMap.get(item.id);
            return (
              <View style={styles.cardWrapper}>
                <EventCard
                  event={item}
                  onPress={onEventPress}
                  variant="horizontal"
                  venues={venues}
                  communities={communities}
                />
                {inviter && (
                  <View style={[styles.inviterBadge, { backgroundColor: theme.colors.background.secondary }]}>
                    {inviter.avatar ? (
                      <UserAvatar
                        user={{ id: '', avatar_url: inviter.avatar } as any}
                        size={16}
                      />
                    ) : null}
                    <Text
                      variant="caption"
                      style={{ color: theme.colors.text.secondary, marginLeft: inviter.avatar ? 4 : 0 }}
                      numberOfLines={1}
                    >
                      From {inviter.name}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
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
  inviterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
});
