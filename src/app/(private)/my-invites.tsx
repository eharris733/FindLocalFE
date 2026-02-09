// src/app/(private)/my-invites.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Text } from '../../components/ui';
import { UserAvatar } from '../../components/UserAvatar';
import {
  getMyInvitations,
  getInvitationRsvps,
  deactivateInvitation,
  reactivateInvitation,
  deleteInvitation,
  removeRsvp,
  getInviteUrl,
  getReceivedDirectInvites,
  respondToDirectInvite,
  EventInvitation,
  RsvpWithProfile,
  DirectInviteWithSender,
} from '../../api/invitations';
import { getEventById } from '../../api/events';
import { logger } from '../../utils/logger';
import { useQueryClient } from '@tanstack/react-query';

interface InvitationWithEvent extends EventInvitation {
  event_title?: string;
  event_date?: string | null;
}

interface ReceivedInviteWithEvent extends DirectInviteWithSender {
  event_title?: string;
  event_date?: string | null;
  event_image_url?: string | null;
}

type RsvpFilter = 'all' | 'yes' | 'maybe' | 'no';
type TabType = 'sent' | 'received';

export default function MyInvitesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('sent');

  // Sent invitations state
  const [invitations, setInvitations] = useState<InvitationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Expanded invitation state
  const [expandedInviteId, setExpandedInviteId] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<RsvpWithProfile[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');

  // Received invitations state
  const [receivedInvites, setReceivedInvites] = useState<ReceivedInviteWithEvent[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    fetchInvitations();
    fetchReceivedInvites();
  }, [isLoggedIn]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await getMyInvitations();
      if (error) {
        logger.error('Error fetching invitations:', error);
        return;
      }

      // Enrich with event details
      const enrichedInvitations = await Promise.all(
        data.map(async (inv) => {
          try {
            const event = await getEventById(inv.event_id);
            return {
              ...inv,
              event_title: event?.title || 'Unknown Event',
              event_date: event?.event_date,
            };
          } catch {
            return { ...inv, event_title: 'Unknown Event' };
          }
        })
      );

      setInvitations(enrichedInvitations);
    } catch (err) {
      logger.error('Error in fetchInvitations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReceivedInvites = async () => {
    try {
      const { data, error } = await getReceivedDirectInvites();
      if (error) {
        logger.error('Error fetching received invites:', error);
        return;
      }

      // Enrich with event details
      const enriched = await Promise.all(
        data.map(async (inv) => {
          try {
            const event = await getEventById(inv.event_id);
            return {
              ...inv,
              event_title: event?.title || 'Unknown Event',
              event_date: event?.event_date,
              event_image_url: event?.image_url,
            };
          } catch {
            return { ...inv, event_title: 'Unknown Event' } as ReceivedInviteWithEvent;
          }
        })
      );

      setReceivedInvites(enriched);
    } catch (err) {
      logger.error('Error in fetchReceivedInvites:', err);
    } finally {
      setLoadingReceived(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvitations();
    fetchReceivedInvites();
  }, []);

  const handleExpandInvite = async (inviteId: string) => {
    if (expandedInviteId === inviteId) {
      setExpandedInviteId(null);
      setRsvps([]);
      return;
    }

    setExpandedInviteId(inviteId);
    setLoadingRsvps(true);
    setRsvpFilter('all');

    try {
      const { data, error } = await getInvitationRsvps(inviteId);
      if (error) {
        logger.error('Error fetching RSVPs:', error);
      } else {
        setRsvps(data);
      }
    } catch (err) {
      logger.error('Error in handleExpandInvite:', err);
    } finally {
      setLoadingRsvps(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = getInviteUrl(token);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
        Alert.alert('Copied!', 'Invite link copied to clipboard');
      } else {
        Alert.alert('Share Link', url);
      }
    } catch (err) {
      logger.error('Error copying link:', err);
    }
  };

  const handleToggleActive = async (invitation: EventInvitation) => {
    try {
      if (invitation.is_active) {
        await deactivateInvitation(invitation.id);
      } else {
        await reactivateInvitation(invitation.id);
      }
      fetchInvitations();
    } catch (err) {
      logger.error('Error toggling invitation:', err);
    }
  };

  const handleDeleteInvitation = async (invitation: EventInvitation) => {
    Alert.alert(
      'Delete Invitation',
      'This will permanently delete this invite and all RSVPs. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvitation(invitation.id);
              setExpandedInviteId(null);
              fetchInvitations();
            } catch (err) {
              logger.error('Error deleting invitation:', err);
            }
          },
        },
      ]
    );
  };

  const handleRemoveRsvp = async (rsvp: RsvpWithProfile) => {
    Alert.alert(
      'Remove RSVP',
      `Remove ${rsvp.full_name || rsvp.username || 'this guest'} from the list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRsvp(rsvp.rsvp_id);
              if (expandedInviteId) {
                const { data } = await getInvitationRsvps(expandedInviteId);
                setRsvps(data);
              }
            } catch (err) {
              logger.error('Error removing RSVP:', err);
            }
          },
        },
      ]
    );
  };

  const handleAcceptInvite = async (invite: ReceivedInviteWithEvent) => {
    setRespondingIds(prev => new Set(prev).add(invite.invite_id));
    try {
      const { success, error } = await respondToDirectInvite(invite.invite_id, 'accepted');
      if (success) {
        setReceivedInvites(prev => prev.filter(i => i.invite_id !== invite.invite_id));
        queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
        queryClient.invalidateQueries({ queryKey: ['userUpcomingRsvps'] });
        router.push(`/event/${invite.event_id}`);
      } else {
        Alert.alert('Error', error || 'Failed to accept invite');
      }
    } catch (err) {
      logger.error('Error accepting invite:', err);
    } finally {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(invite.invite_id);
        return next;
      });
    }
  };

  const handleDeclineInvite = async (invite: ReceivedInviteWithEvent) => {
    setRespondingIds(prev => new Set(prev).add(invite.invite_id));
    try {
      const { success, error } = await respondToDirectInvite(invite.invite_id, 'declined');
      if (success) {
        setReceivedInvites(prev => prev.filter(i => i.invite_id !== invite.invite_id));
        queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
      } else {
        Alert.alert('Error', error || 'Failed to decline invite');
      }
    } catch (err) {
      logger.error('Error declining invite:', err);
    } finally {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(invite.invite_id);
        return next;
      });
    }
  };

  const filteredRsvps = rsvps.filter((rsvp) => {
    if (rsvpFilter === 'all') return true;
    return rsvp.response === rsvpFilter;
  });

  const getRsvpCounts = () => {
    const yes = rsvps.filter((r) => r.response === 'yes').length;
    const maybe = rsvps.filter((r) => r.response === 'maybe').length;
    const no = rsvps.filter((r) => r.response === 'no').length;
    return { yes, maybe, no, total: rsvps.length };
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text variant="body1" style={{ color: theme.colors.text.secondary }}>← Back</Text>
        </TouchableOpacity>
        <Text variant="h3" style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          My Invitations
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab toggle */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border.light }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sent' && {
              borderBottomColor: theme.colors.primary[500],
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('sent')}
        >
          <Text
            variant="body1"
            style={{
              fontWeight: activeTab === 'sent' ? '600' : '400',
              color: activeTab === 'sent' ? theme.colors.text.primary : theme.colors.text.tertiary,
            }}
          >
            Sent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'received' && {
              borderBottomColor: theme.colors.primary[500],
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('received')}
        >
          <View style={styles.tabWithBadge}>
            <Text
              variant="body1"
              style={{
                fontWeight: activeTab === 'received' ? '600' : '400',
                color: activeTab === 'received' ? theme.colors.text.primary : theme.colors.text.tertiary,
              }}
            >
              Received
            </Text>
            {receivedInvites.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.secondary[500] }]}>
                <Text variant="caption" style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                  {receivedInvites.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📨</Text>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        No invitations yet
      </Text>
      <Text variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
        Create an invite from any event page to share with friends
      </Text>
    </View>
  );

  const renderReceivedEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>💌</Text>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        No invitations received
      </Text>
      <Text variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
        When friends invite you to events, they'll show up here
      </Text>
    </View>
  );

  const renderInvitation = ({ item: invitation }: { item: InvitationWithEvent }) => (
    <View
      style={[styles.invitationCard, {
        backgroundColor: theme.colors.background.secondary,
        borderColor: invitation.is_active
          ? theme.colors.primary[300]
          : theme.colors.border.light,
        opacity: invitation.is_active ? 1 : 0.7,
      }]}
    >
      {/* Invitation Header */}
      <TouchableOpacity
        style={styles.invitationHeader}
        onPress={() => handleExpandInvite(invitation.id)}
      >
        <View style={styles.invitationInfo}>
          <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
            {invitation.event_title}
          </Text>
          {invitation.event_date && (
            <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
              {new Date(invitation.event_date).toLocaleDateString()}
            </Text>
          )}
          <View style={styles.invitationMeta}>
            <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
              {invitation.use_count} RSVPs • {invitation.view_count} views
            </Text>
            {!invitation.is_active && (
              <View style={[styles.inactiveBadge, { backgroundColor: theme.colors.warning }]}>
                <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
                  Inactive
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>
          {expandedInviteId === invitation.id ? '▼' : '›'}
        </Text>
      </TouchableOpacity>

      {/* Settings indicators */}
      <View style={styles.settingsRow}>
        {invitation.passcode && (
          <View style={[styles.settingBadge, { backgroundColor: theme.colors.primary[100] }]}>
            <Text variant="caption" style={{ color: theme.colors.primary[700] }}>
              🔒 Passcode
            </Text>
          </View>
        )}
        {invitation.allow_plus_one && (
          <View style={[styles.settingBadge, { backgroundColor: theme.colors.gray[200] }]}>
            <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
              +1 Allowed
            </Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.primary[500] }]}
          onPress={() => handleCopyLink(invitation.invite_token)}
        >
          <Text variant="caption" style={{ color: theme.colors.primary[600], fontWeight: '600' }}>
            📋 Copy Link
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, {
            borderColor: invitation.is_active ? theme.colors.warning : theme.colors.success
          }]}
          onPress={() => handleToggleActive(invitation)}
        >
          <Text variant="caption" style={{
            color: invitation.is_active ? theme.colors.warning : theme.colors.success,
            fontWeight: '600',
          }}>
            {invitation.is_active ? '⏸ Pause' : '▶️ Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: theme.colors.error }]}
          onPress={() => handleDeleteInvitation(invitation)}
        >
          <Text variant="caption" style={{ color: theme.colors.error, fontWeight: '600' }}>
            🗑️
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expanded RSVP List */}
      {expandedInviteId === invitation.id && (
        <View style={[styles.rsvpSection, { borderTopColor: theme.colors.border.light }]}>
          {loadingRsvps ? (
            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          ) : rsvps.length === 0 ? (
            <Text variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
              No RSVPs yet
            </Text>
          ) : (
            <>
              {/* RSVP Summary */}
              <View style={styles.rsvpSummary}>
                {(() => {
                  const counts = getRsvpCounts();
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.filterButton, rsvpFilter === 'all' && { backgroundColor: theme.colors.primary[100] }]}
                        onPress={() => setRsvpFilter('all')}
                      >
                        <Text variant="caption" style={{ color: theme.colors.text.primary }}>
                          All ({counts.total})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.filterButton, rsvpFilter === 'yes' && { backgroundColor: theme.colors.success + '30' }]}
                        onPress={() => setRsvpFilter('yes')}
                      >
                        <Text variant="caption" style={{ color: theme.colors.success }}>
                          Going ({counts.yes})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.filterButton, rsvpFilter === 'maybe' && { backgroundColor: theme.colors.warning + '30' }]}
                        onPress={() => setRsvpFilter('maybe')}
                      >
                        <Text variant="caption" style={{ color: theme.colors.warning }}>
                          Maybe ({counts.maybe})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.filterButton, rsvpFilter === 'no' && { backgroundColor: theme.colors.error + '30' }]}
                        onPress={() => setRsvpFilter('no')}
                      >
                        <Text variant="caption" style={{ color: theme.colors.error }}>
                          No ({counts.no})
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>

              {/* RSVP List */}
              {filteredRsvps.map((rsvp) => (
                <View
                  key={rsvp.rsvp_id}
                  style={[styles.rsvpItem, { borderBottomColor: theme.colors.border.light }]}
                >
                  <View style={styles.rsvpInfo}>
                    <View style={[styles.rsvpAvatar, { backgroundColor: theme.colors.primary[200] }]}>
                      <Text variant="body2" style={{ color: theme.colors.primary[700] }}>
                        {(rsvp.full_name || rsvp.username || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text variant="body2" style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                        {rsvp.full_name || rsvp.username || 'Unknown'}
                      </Text>
                      {rsvp.plus_one_count > 0 && (
                        <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                          +{rsvp.plus_one_count} guest{rsvp.plus_one_count > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.rsvpActions}>
                    <View style={[styles.responseBadge, {
                      backgroundColor: rsvp.response === 'yes'
                        ? theme.colors.success
                        : rsvp.response === 'maybe'
                        ? theme.colors.warning
                        : theme.colors.error,
                    }]}>
                      <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
                        {rsvp.response === 'yes' ? 'Going' : rsvp.response === 'maybe' ? 'Maybe' : 'No'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveRsvp(rsvp)}
                    >
                      <Text variant="caption" style={{ color: theme.colors.error }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderReceivedInvite = ({ item: invite }: { item: ReceivedInviteWithEvent }) => {
    const isResponding = respondingIds.has(invite.invite_id);

    return (
      <View
        style={[styles.receivedCard, {
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.light,
        }]}
      >
        <View style={styles.receivedCardContent}>
          {/* Event image */}
          <Image
            source={
              invite.event_image_url
                ? { uri: invite.event_image_url }
                : require('../../../assets/record.png')
            }
            style={[styles.receivedEventImage, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />

          <View style={styles.receivedCardInfo}>
            <Text variant="body1" style={{ fontWeight: '600' }} numberOfLines={2}>
              {invite.event_title}
            </Text>
            {invite.event_date && (
              <Text variant="caption" color="secondary">
                {new Date(invite.event_date).toLocaleDateString()}
              </Text>
            )}

            {/* From user */}
            <View style={styles.fromRow}>
              <UserAvatar
                user={{
                  id: invite.sender_id,
                  username: invite.sender_username,
                  full_name: invite.sender_name,
                  avatar_url: invite.sender_avatar,
                } as any}
                size={20}
              />
              <Text variant="caption" color="secondary" style={{ marginLeft: 6 }}>
                From {invite.sender_username ? `@${invite.sender_username}` : invite.sender_name || 'a friend'}
              </Text>
            </View>

            {/* Message */}
            {invite.message && (
              <Text variant="caption" color="tertiary" numberOfLines={2} style={{ marginTop: 4 }}>
                "{invite.message}"
              </Text>
            )}
          </View>
        </View>

        {/* Accept / Decline buttons */}
        <View style={styles.receivedActions}>
          <TouchableOpacity
            style={[styles.declineButton, { borderColor: theme.colors.border.medium }]}
            onPress={() => handleDeclineInvite(invite)}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color={theme.colors.text.secondary} />
            ) : (
              <Text variant="body2" color="secondary">
                Decline
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={() => handleAcceptInvite(invite)}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text variant="body2" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Accept
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const isLoadingContent = activeTab === 'sent' ? loading : loadingReceived;

  if (isLoadingContent) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body1" style={{ color: theme.colors.text.secondary, marginTop: 16 }}>
            Loading your invitations...
          </Text>
        </View>
      </View>
    );
  }

  if (activeTab === 'received') {
    return (
      <FlatList
        style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
        contentContainerStyle={receivedInvites.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
        data={receivedInvites}
        keyExtractor={(item) => item.invite_id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderReceivedEmptyState}
        renderItem={renderReceivedInvite}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
      />
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={invitations.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
      data={invitations}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderSentEmptyState}
      renderItem={renderInvitation}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary[500]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  // Sent invitation styles
  invitationCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  settingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  rsvpSection: {
    borderTopWidth: 1,
    padding: 16,
  },
  rsvpSummary: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rsvpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rsvpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rsvpAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rsvpActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButton: {
    padding: 8,
  },
  // Received invitation styles
  receivedCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 16,
  },
  receivedCardContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  receivedEventImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  receivedCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  receivedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
});
