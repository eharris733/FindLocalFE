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
import { useCityLocation } from '../context/CityContext';
import { useCommunity } from '../context/CommunityContext';
import { Text } from '../components/ui';
import { getFollowedVenues, unfollowVenue, followVenue, VenueFollow } from '../api/friends';
import { getRecommendedVenues } from '../api/venues';
import { Venue } from '../types/venues';
import { logger } from '../utils/logger';

interface VenueItemProps {
  readonly venue: Venue;
  readonly onUnfollow: (venueId: string) => Promise<void>;
  readonly onPress: (venueId: string) => void;
  readonly theme: any;
}

interface RecommendedVenueItemProps {
  readonly venue: Venue;
  readonly onFollow: (venueId: string) => Promise<void>;
  readonly onPress: (venueId: string) => void;
  readonly theme: any;
}

function RecommendedVenueItem({ venue, onFollow, onPress, theme }: RecommendedVenueItemProps) {
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: any) => {
    e.stopPropagation();
    setLoading(true);
    await onFollow(venue.id);
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

      {/* Follow Button */}
      <TouchableOpacity
        style={[styles.followButton, {
          backgroundColor: theme.colors.primary[500],
        }]}
        onPress={handleFollow}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text variant="body2" style={{ color: '#fff', fontWeight: '600' }}>
            Follow
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
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
  const { selectedCity } = useCityLocation();
  const { allCommunities, selectedCommunities } = useCommunity();
  const router = useRouter();

  const [venues, setVenues] = useState<VenueFollow[]>([]);
  const [recommendedVenues, setRecommendedVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
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

  const fetchRecommendedVenues = useCallback(async () => {
    if (!isLoggedIn || !selectedCity) {
      return;
    }

    setLoadingRecommendations(true);
    try {
      // Get community IDs from selected communities
      const communityIds = selectedCommunities.length > 0
        ? allCommunities
            .filter(c => selectedCommunities.includes(c.name))
            .map(c => c.id)
        : undefined;

      // Get IDs of venues user is already following
      const excludeVenueIds = venues.map(v => v.venue_id);

      const recommended = await getRecommendedVenues(
        selectedCity,
        communityIds,
        excludeVenueIds,
        6 // Limit to 6 recommendations
      );

      setRecommendedVenues(recommended);
    } catch (err) {
      logger.error('Error fetching recommended venues:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [isLoggedIn, selectedCity, selectedCommunities, allCommunities, venues]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    // Fetch recommendations when venues are loaded
    if (!loading && venues) {
      fetchRecommendedVenues();
    }
  }, [loading, venues.length, selectedCity, selectedCommunities]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVenues();
    await fetchRecommendedVenues();
    setRefreshing(false);
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
        // Refresh recommendations
        fetchRecommendedVenues();
      }
    } catch (err) {
      logger.error('Error in handleUnfollow:', err);
    }
  };

  const handleFollow = async (venueId: string) => {
    try {
      const { success, error } = await followVenue(venueId);
      if (error) {
        logger.error('Error following venue:', error);
        return;
      }
      if (success) {
        // Remove from recommendations and refresh followed venues
        setRecommendedVenues((prev) => prev.filter((v) => v.id !== venueId));
        await fetchVenues();
      }
    } catch (err) {
      logger.error('Error in handleFollow:', err);
    }
  };

  const handleVenuePress = (venueId: string) => {
    router.push(`/venue/${venueId}`);
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
      
      <Text variant="h2" style={{ color: theme.colors.text.primary }}>
        Followed Venues
      </Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderEmptyVenues = () => (
    <View style={styles.emptyState}>
      <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        🏛️ No Followed Venues
      </Text>
      <Text variant="body1" color="secondary" style={{ textAlign: 'center', maxWidth: 300, marginBottom: 24 }}>
        Follow venues to get updates about their events. You can follow venues from any event page.
      </Text>
      {/* Show recommendations in empty state */}
      {renderRecommendations()}
    </View>
  );

  const renderRecommendations = () => {
    if (loadingRecommendations) {
      return (
        <View style={{ marginTop: 24, alignItems: 'center', paddingHorizontal: 16 }}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          <Text variant="caption" color="secondary" style={{ marginTop: 8 }}>
            Finding venues for you...
          </Text>
        </View>
      );
    }

    if (recommendedVenues.length === 0) {
      return null;
    }

    return (
      <View style={styles.recommendationsContainer}>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 4 }}>
            Recommended for You
          </Text>
          <Text variant="caption" color="secondary">
            Based on your interests in {selectedCity}
          </Text>
        </View>
        {recommendedVenues.map((venue, index) => (
          <View key={venue.id} style={{ paddingHorizontal: 16 }}>
            <RecommendedVenueItem
              venue={venue}
              onFollow={handleFollow}
              onPress={handleVenuePress}
              theme={theme}
            />
            {index < recommendedVenues.length - 1 && <View style={{ height: 12 }} />}
          </View>
        ))}
      </View>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: theme.colors.background.primary }]}>
        {renderHeader()}
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
    );
  }

  if (loading) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: theme.colors.background.primary }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.mainContainer, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={venues.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
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
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyVenues}
      ListFooterComponent={venues.length > 0 ? renderRecommendations : undefined}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary[500]}
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
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
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  recommendationsContainer: {
    marginTop: 24,
    width: '100%',
  },
  signInButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
