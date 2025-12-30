// src/app/following-activity.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { Text } from '../components/ui';
import PageView from '../components/ui/PageView';
import { getEventsFromFollowedCreators, CreatorEventActivity } from '../api/events';
import { logger } from '../utils/logger';

interface ActivityCardProps {
  readonly activity: CreatorEventActivity;
  readonly onEventPress: (eventId: string) => void;
  readonly onCreatorPress: (username: string) => void;
  readonly theme: any;
}

function ActivityCard({ activity, onEventPress, onCreatorPress, theme }: ActivityCardProps) {
  const { event, creator, activity_type, activity_date } = activity;

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatActivityDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.activityCard, { backgroundColor: theme.colors.background.secondary }]}>
      {/* Creator Header */}
      <TouchableOpacity
        style={styles.creatorHeader}
        onPress={() => creator.username && onCreatorPress(creator.username)}
      >
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatar} />
        ) : (
          <View style={[styles.creatorAvatar, { backgroundColor: theme.colors.primary[500] }]}>
            <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
              {getInitials(creator.full_name)}
            </Text>
          </View>
        )}
        <View style={styles.creatorInfo}>
          <Text variant="body2" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
            {creator.full_name || 'Anonymous'}
          </Text>
          <Text variant="caption" color="tertiary">
            {activity_type === 'shared' ? 'Shared an event' : 'Is attending'} •{' '}
            {formatActivityDate(activity_date)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Event Card */}
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: theme.colors.background.primary }]}
        onPress={() => onEventPress(event.id)}
      >
        {event.image_url && (
          <Image source={{ uri: event.image_url }} style={styles.eventImage} />
        )}
        <View style={styles.eventInfo}>
          <Text variant="caption" style={{ color: theme.colors.secondary[500], fontWeight: '600' }}>
            {formatEventDate(event.event_date)}
          </Text>
          <Text
            variant="body1"
            style={{ fontWeight: '600', color: theme.colors.text.primary, marginTop: 4 }}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          {event.region && (
            <Text variant="caption" color="secondary" style={{ marginTop: 4 }}>
              📍 {event.region}, {event.city}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function FollowingActivityPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { session, isLoggedIn } = useAuth();
  const user = session?.user;

  const [activities, setActivities] = useState<CreatorEventActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user) {
      loadActivities();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, user]);

  const loadActivities = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getEventsFromFollowedCreators(user.id);
      setActivities(data);
    } catch (error) {
      logger.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const handleCreatorPress = (username: string) => {
    router.push(`/user/${username}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🎭</Text>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        No activity yet
      </Text>
      <Text variant="body2" color="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
        Follow creators to see events they share and attend!
      </Text>
      <TouchableOpacity
        style={[styles.discoverButton, { backgroundColor: theme.colors.primary[500] }]}
        onPress={() => router.push('/discover-creators')}
      >
        <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
          Discover Creators
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignInPrompt = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🔒</Text>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        Sign in to see activity
      </Text>
      <Text variant="body2" color="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
        Create an account to follow creators and see their events.
      </Text>
      <TouchableOpacity
        style={[styles.discoverButton, { backgroundColor: theme.colors.primary[500] }]}
        onPress={() => router.push('/user/signin')}
      >
        <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
          Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!isLoggedIn) {
    return <PageView title="Following">{renderSignInPrompt()}</PageView>;
  }

  return (
    <PageView title="Following">
      {/* Header info */}
      <View style={[styles.headerInfo, { backgroundColor: theme.colors.background.secondary }]}>
        <Text variant="body2" color="secondary">
          Events shared by creators you follow
        </Text>
        <TouchableOpacity onPress={() => router.push('/discover-creators')}>
          <Text variant="body2" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
            Find More Creators
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body2" color="secondary" style={{ marginTop: 12 }}>
            Loading activity...
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => `${item.event.id}-${item.creator.id}-${item.activity_date}`}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onEventPress={handleEventPress}
              onCreatorPress={handleCreatorPress}
              theme={theme}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={activities.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary[500]}
            />
          }
        />
      )}
    </PageView>
  );
}

const styles = StyleSheet.create({
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  activityCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  eventCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventInfo: {
    padding: 12,
  },
  discoverButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
});
