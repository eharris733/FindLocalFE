// src/components/EventHistory.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import {
  getUserEventHistory,
  getUserHostedEvents,
  UserEventHistoryItem,
  UserHostedEventItem,
} from '../api/invitations';
import { logger } from '../utils/logger';

type TabType = 'attended' | 'hosted';

interface EventHistoryProps {
  onEventPress?: (eventId: string) => void;
  showTabs?: boolean;
  defaultTab?: TabType;
  maxItems?: number;
}

const EventHistory: React.FC<EventHistoryProps> = ({
  onEventPress,
  showTabs = true,
  defaultTab = 'attended',
  maxItems,
}) => {
  const { theme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [attendedEvents, setAttendedEvents] = useState<UserEventHistoryItem[]>([]);
  const [hostedEvents, setHostedEvents] = useState<UserHostedEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendedTotal, setAttendedTotal] = useState(0);
  const [hostedTotal, setHostedTotal] = useState(0);

  const loadData = useCallback(async (isRefresh = false, isMounted = { current: true }) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [attendedResult, hostedResult] = await Promise.all([
        getUserEventHistory({ includeFriends: true, limit: maxItems ?? 50 }),
        getUserHostedEvents({ limit: maxItems ?? 50 }),
      ]);

      // Only update state if still mounted
      if (!isMounted.current) return;

      if (!attendedResult.error) {
        setAttendedEvents(attendedResult.data);
        setAttendedTotal(attendedResult.total);
      }

      if (!hostedResult.error) {
        setHostedEvents(hostedResult.data);
        setHostedTotal(hostedResult.total);
      }
    } catch (err) {
      logger.error('Error loading event history:', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [maxItems]);

  useEffect(() => {
    const isMounted = { current: true };
    loadData(false, isMounted);
    return () => { isMounted.current = false; };
  }, [loadData]);

  const handleEventPress = (eventId: string) => {
    if (onEventPress) {
      onEventPress(eventId);
    } else {
      router.push(`/event/${eventId}`);
    }
  };

  const renderAttendedItem = ({ item }: { item: UserEventHistoryItem }) => {
    const eventDate = item.event_date ? new Date(item.event_date) : null;

    return (
      <TouchableOpacity
        style={[styles.historyCard, { backgroundColor: theme.colors.background.secondary }]}
        onPress={() => handleEventPress(item.event_id)}
      >
        <View style={styles.cardContent}>
          {/* Event image */}
          <Image
            source={
              item.event_image_url
                ? { uri: item.event_image_url }
                : require('../../assets/record.png')
            }
            style={[styles.eventImage, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />

          {/* Event details */}
          <View style={styles.eventDetails}>
            <View style={styles.titleRow}>
              <Text variant="body1" numberOfLines={2} style={styles.eventTitle}>
                {item.event_title || 'Untitled Event'}
              </Text>
              {item.is_past && (
                <View style={[styles.pastBadge, { backgroundColor: theme.colors.gray[200] }]}>
                  <Text variant="caption" style={{ color: theme.colors.gray[600], fontSize: 10 }}>
                    PAST
                  </Text>
                </View>
              )}
            </View>

            {item.venue_name && (
              <Text variant="caption" color="secondary" numberOfLines={1} style={styles.venueName}>
                📍 {item.venue_name}
              </Text>
            )}

            {eventDate && (
              <Text variant="caption" color="secondary" style={styles.eventDate}>
                📅 {format(eventDate, 'MMM d, yyyy')}
              </Text>
            )}

            {/* RSVP status */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.rsvpBadge,
                  {
                    backgroundColor:
                      item.response === 'yes'
                        ? theme.colors.success[100]
                        : theme.colors.warning[100],
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color:
                      item.response === 'yes'
                        ? theme.colors.success[700]
                        : theme.colors.warning[700],
                    fontWeight: '600',
                    fontSize: 10,
                  }}
                >
                  {item.response === 'yes' ? 'WENT' : 'MAYBE'}
                </Text>
              </View>
            </View>

            {/* Friends who attended */}
            {item.friends_attending && item.friends_attending.length > 0 && (
              <View style={styles.friendsRow}>
                <View style={styles.friendAvatars}>
                  {item.friends_attending.slice(0, 3).map((friend, index) => (
                    <View
                      key={friend.user_id}
                      style={[
                        styles.friendAvatar,
                        {
                          backgroundColor: theme.colors.primary[500],
                          marginLeft: index > 0 ? -8 : 0,
                          zIndex: 3 - index,
                        },
                      ]}
                    >
                      {friend.avatar_url ? (
                        <Image
                          source={{ uri: friend.avatar_url }}
                          style={styles.friendAvatarImage}
                        />
                      ) : (
                        <Text style={styles.friendInitial}>
                          {(friend.full_name || friend.username || '?')[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
                <Text variant="caption" color="secondary" style={styles.friendsText}>
                  with{' '}
                  {item.friends_attending.length === 1
                    ? item.friends_attending[0].full_name ||
                      item.friends_attending[0].username ||
                      '1 friend'
                    : `${item.friends_attending.length} friends`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHostedItem = ({ item }: { item: UserHostedEventItem }) => {
    const eventDate = item.event_date ? new Date(item.event_date) : null;

    return (
      <TouchableOpacity
        style={[styles.historyCard, { backgroundColor: theme.colors.background.secondary }]}
        onPress={() => handleEventPress(item.event_id)}
      >
        <View style={styles.cardContent}>
          {/* Event image */}
          <Image
            source={
              item.event_image_url
                ? { uri: item.event_image_url }
                : require('../../assets/record.png')
            }
            style={[styles.eventImage, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />

          {/* Event details */}
          <View style={styles.eventDetails}>
            <View style={styles.titleRow}>
              <Text variant="body1" numberOfLines={2} style={styles.eventTitle}>
                {item.event_title || 'Untitled Event'}
              </Text>
              {item.is_past && (
                <View style={[styles.pastBadge, { backgroundColor: theme.colors.gray[200] }]}>
                  <Text variant="caption" style={{ color: theme.colors.gray[600], fontSize: 10 }}>
                    PAST
                  </Text>
                </View>
              )}
            </View>

            {item.venue_name && (
              <Text variant="caption" color="secondary" numberOfLines={1} style={styles.venueName}>
                📍 {item.venue_name}
              </Text>
            )}

            {eventDate && (
              <Text variant="caption" color="secondary" style={styles.eventDate}>
                📅 {format(eventDate, 'MMM d, yyyy')}
              </Text>
            )}

            {/* Host stats */}
            <View style={styles.hostStatsRow}>
              <View style={[styles.statBadge, { backgroundColor: theme.colors.primary[100] }]}>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primary[700], fontWeight: '600', fontSize: 10 }}
                >
                  {item.invitation_count} {item.invitation_count === 1 ? 'invite' : 'invites'}
                </Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: theme.colors.success[100] }]}>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.success[700], fontWeight: '600', fontSize: 10 }}
                >
                  {item.yes_count} going
                </Text>
              </View>
              {item.maybe_count > 0 && (
                <View style={[styles.statBadge, { backgroundColor: theme.colors.warning[100] }]}>
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.warning[700], fontWeight: '600', fontSize: 10 }}
                  >
                    {item.maybe_count} maybe
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: TabType) => (
    <View style={styles.emptyState}>
      <Text variant="h4" style={{ marginBottom: 8 }}>
        {type === 'attended' ? 'No events yet' : 'No hosted events'}
      </Text>
      <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
        {type === 'attended'
          ? "Events you RSVP to will appear here so you can look back on great times!"
          : "Events you create invitations for will appear here."}
      </Text>
    </View>
  );

  const currentData = activeTab === 'attended' ? attendedEvents : hostedEvents;
  const currentTotal = activeTab === 'attended' ? attendedTotal : hostedTotal;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      {showTabs && (
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.background.secondary }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'attended' && {
                backgroundColor: theme.colors.background.primary,
                borderBottomColor: theme.colors.primary[500],
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('attended')}
          >
            <Text
              variant="body2"
              style={{
                fontWeight: activeTab === 'attended' ? '600' : '400',
                color:
                  activeTab === 'attended'
                    ? theme.colors.primary[500]
                    : theme.colors.text.secondary,
              }}
            >
              Attended ({attendedTotal})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'hosted' && {
                backgroundColor: theme.colors.background.primary,
                borderBottomColor: theme.colors.primary[500],
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('hosted')}
          >
            <Text
              variant="body2"
              style={{
                fontWeight: activeTab === 'hosted' ? '600' : '400',
                color:
                  activeTab === 'hosted'
                    ? theme.colors.primary[500]
                    : theme.colors.text.secondary,
              }}
            >
              Hosted ({hostedTotal})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {currentData.length === 0 ? (
        renderEmptyState(activeTab)
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) =>
            'rsvp_date' in item ? `attended-${item.event_id}` : `hosted-${item.event_id}`
          }
          renderItem={activeTab === 'attended' ? renderAttendedItem : renderHostedItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={theme.colors.primary[500]}
            />
          }
          ListFooterComponent={
            currentData.length < currentTotal ? (
              <View style={styles.moreIndicator}>
                <Text variant="caption" color="secondary">
                  Showing {currentData.length} of {currentTotal} events
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  historyCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  eventDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  eventTitle: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
  pastBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  venueName: {
    marginBottom: 2,
  },
  eventDate: {
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rsvpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  friendAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  friendInitial: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  friendsText: {
    fontSize: 11,
  },
  hostStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  moreIndicator: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default EventHistory;
