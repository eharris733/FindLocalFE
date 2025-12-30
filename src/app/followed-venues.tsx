// src/app/followed-venues.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { getFollowedVenues, unfollowVenue, VenueFollow } from '../api/friends';
import { Venue } from '../types/venues';
import { logger } from '../utils/logger';

interface VenueItemProps {
  readonly venue: Venue;
  readonly onUnfollow: (venueId: string) => Promise<void>;
  readonly onPress: (venueId: string) => void;
  readonly theme: any;
}

function VenueItem({ venue, onUnfollow, onPress, theme }: VenueItemProps) {
  const [loading, setLoading] = useState(false);

  const handleUnfollow = async (e: any) => {
    e.stopPropagation();
    setLoading(true);
    await onUnfollow(venue.id);
    setLoading(false);
  };

  const getVenueInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity 
      style={[styles.venueItem, { backgroundColor: theme.colors.background.secondary }]}
      onPress={() => onPress(venue.id)}
      activeOpacity={0.7}
    >
      {/* Venue Image */}
      {venue.image ? (
        <Image source={{ uri: venue.image }} style={styles.venueImage} />
      ) : (
        <View style={[styles.venueImage, { backgroundColor: theme.colors.primary[500], alignItems: 'center', justifyContent: 'center' }]}>
          <Text variant="h3" style={{ color: '#fff', fontWeight: '600' }}>
            {getVenueInitials(venue.name)}
          </Text>
        </View>
      )}

      {/* Venue Info */}
      <View style={styles.venueInfo}>
        <Text variant="body1" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
          {venue.name}
        </Text>
        <Text variant="caption" color="secondary">
          📍 {venue.city}{venue.region ? `, ${venue.region}` : ''}
        </Text>
        {venue.type && (
          <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary[100] }]}>
            <Text variant="caption" style={{ color: theme.colors.primary[700], fontWeight: '600' }}>
              {venue.type}
            </Text>
          </View>
        )}
      </View>

      {/* Unfollow Button */}
      <TouchableOpacity
        style={[styles.unfollowButton, {
          borderColor: theme.colors.primary[500],
          borderWidth: 2,
        }]}
        onPress={handleUnfollow}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        ) : (
          <Text variant="body2" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
            Following
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FollowedVenuesPage() {
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const [venues, setVenues] = useState<VenueFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVenues = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await getFollowedVenues();
      if (error) {
        logger.error('Error fetching followed venues:', error);
      } else {
        setVenues(data);
      }
    } catch (err) {
      logger.error('Error in fetchVenues:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVenues();
  };

  const handleUnfollow = async (venueId: string) => {
    try {
      const { success, error } = await unfollowVenue(venueId);
      if (error) {
        logger.error('Error unfollowing venue:', error);
        return;
      }
      if (success) {
        // Remove from local state
        setVenues((prev) => prev.filter((v) => v.venue_id !== venueId));
      }
    } catch (err) {
      logger.error('Error in handleUnfollow:', err);
    }
  };

  const handleVenuePress = (venueId: string) => {
    router.push(`/venue/${venueId}`);
  };

  if (!isLoggedIn) {
    return (
      <PageView>
        <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
          <View style={styles.emptyState}>
            <Text variant="h2" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
              Sign In Required
            </Text>
            <Text variant="body1" color="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
              Sign in to see your followed venues
            </Text>
            <TouchableOpacity
              style={[styles.signInButton, { backgroundColor: theme.colors.primary[500] }]}
              onPress={() => router.push('/user/signin')}
            >
              <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </PageView>
    );
  }

  return (
    <PageView>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text variant="body1" color="primary">← Back</Text>
          </TouchableOpacity>
          <Text variant="h2" style={{ color: theme.colors.text.primary }}>
            Followed Venues
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
              🏛️ No Followed Venues
            </Text>
            <Text variant="body1" color="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
              Follow venues to get updates about their events. You can follow venues from any event page.
            </Text>
          </View>
        ) : (
          <FlatList
            data={venues}
            renderItem={({ item }) => (
              item.venue ? (
                <VenueItem
                  venue={item.venue}
                  onUnfollow={handleUnfollow}
                  onPress={handleVenuePress}
                  theme={theme}
                />
              ) : null
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary[500]}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </View>
    </PageView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContainer: {
    padding: 16,
  },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  venueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  venueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  unfollowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  signInButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
