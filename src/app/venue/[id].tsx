// src/app/venue/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Venue } from '../../types/venues';
import type { Event } from '../../types/events';
import { getVenueById } from '../../api/venues';
import { getUpcomingEventsForVenue } from '../../api/events';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/ui';
import { getVenueSizeLabel } from '../../utils/venueUtils';
import { logger } from '../../utils/logger';
import { useAuth } from '../../hooks/useAuth';
import { followVenue, unfollowVenue, checkFollowingVenue, getVenueFollowerCount } from '../../api/friends';
import PageView from '../../components/ui/PageView';

const { width } = Dimensions.get('window');

// Helper function to format time
function formatMilitaryTime(time: string): string {
  if (!time || typeof time !== 'string' || !time.includes(':')) {
    return time;
  }

  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const isPM = hours >= 12;
  let formattedHours: number;
  if (isPM) {
    formattedHours = hours === 12 ? 12 : hours - 12;
  } else {
    formattedHours = hours === 0 ? 12 : hours;
  }
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes} ${isPM ? 'PM' : 'AM'}`;
}

export default function VenuePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVenueData();
    }
  }, [id]);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (venue?.id && isLoggedIn) {
        const [followResult, countResult] = await Promise.all([
          checkFollowingVenue(venue.id),
          getVenueFollowerCount(venue.id),
        ]);
        setIsFollowing(followResult.isFollowing);
        setFollowerCount(countResult.count);
      }
    };
    checkFollowStatus();
  }, [venue?.id, isLoggedIn]);

  const fetchVenueData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const venueData = await getVenueById(id);
      
      if (!venueData) {
        setError('Venue not found');
        setLoading(false);
        return;
      }
      
      setVenue(venueData);
      
      // Fetch upcoming events for this venue
      const events = await getUpcomingEventsForVenue(id, 3);
      setUpcomingEvents(events);
      
    } catch (err) {
      logger.error('Error fetching venue data:', err);
      setError('Failed to load venue information');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS === 'web' && globalThis.window !== undefined) {
      if (globalThis.window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/');
      }
    }
  };

  const handleToggleFollow = async () => {
    if (!venue?.id || !isLoggedIn) {
      router.push('/user/signin');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { success } = await unfollowVenue(venue.id);
        if (success) {
          setIsFollowing(false);
          setFollowerCount(prev => Math.max(0, prev - 1));
        }
      } else {
        const { success } = await followVenue(venue.id);
        if (success) {
          setIsFollowing(true);
          setFollowerCount(prev => prev + 1);
        }
      }
    } catch (err) {
      logger.error('Error toggling venue follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAddressPress = () => {
    if (venue?.address) {
      const encodedAddress = encodeURIComponent(venue.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      Linking.openURL(mapsUrl);
    }
  };

  const handleWebsitePress = () => {
    if (venue?.url) {
      Linking.openURL(venue.url);
    }
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const venueSizeLabel = venue?.venue_size ? getVenueSizeLabel(venue.venue_size) : null;

  if (loading) {
    return (
      <PageView>
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body1" color="secondary" style={{ marginTop: 16 }}>
            Loading venue...
          </Text>
        </View>
      </PageView>
    );
  }

  if (error || !venue) {
    return (
      <PageView>
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.background.primary }]}>
          <Text variant="h2" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {error || 'Venue not found'}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={handleBack}
          >
            <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </PageView>
    );
  }

  return (
    <PageView>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { 
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
        }]}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBackButton}>
            <Text variant="body1" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text variant="h4" style={{ color: theme.colors.text.primary, flex: 1, textAlign: 'center' }} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={styles.headerBackButton} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Venue Image */}
          {venue.image && (
            <Image
              source={{ uri: venue.image }}
              style={[styles.venueImage, { backgroundColor: theme.colors.gray[100] }]}
              resizeMode="cover"
            />
          )}

          <View style={styles.content}>
            {/* Venue Info Card */}
            <View style={[styles.infoCard, { backgroundColor: theme.colors.background.secondary }]}>
              <Text variant="h2" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
                {venue.name}
              </Text>

              {/* Type and Size badges */}
              <View style={styles.badgeRow}>
                {venue.type && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary[100] }]}>
                    <Text variant="caption" style={{ color: theme.colors.primary[700], fontWeight: '600' }}>
                      {venue.type}
                    </Text>
                  </View>
                )}
                {venueSizeLabel && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.gray[100] }]}>
                    <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                      👥 {venueSizeLabel}
                    </Text>
                  </View>
                )}
              </View>

              {/* Follower count and Follow button */}
              <View style={styles.followRow}>
                <Text variant="body2" color="secondary">
                  {followerCount} follower{followerCount === 1 ? '' : 's'}
                </Text>
                <TouchableOpacity
                  style={[styles.followButton, {
                    backgroundColor: isFollowing ? 'transparent' : theme.colors.primary[500],
                    borderWidth: isFollowing ? 2 : 0,
                    borderColor: theme.colors.primary[500],
                  }]}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary[500] : '#fff'} />
                  ) : (
                    <Text variant="body2" style={{
                      color: isFollowing ? theme.colors.primary[500] : '#fff',
                      fontWeight: '600',
                    }}>
                      {isFollowing ? '✓ Following' : '+ Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Location */}
              <View style={[styles.infoSection, { borderTopColor: theme.colors.border.light }]}>
                <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginBottom: 4 }}>
                  LOCATION
                </Text>
                <Text variant="body1" style={{ color: theme.colors.text.primary }}>
                  📍 {venue.city}{venue.region ? `, ${venue.region}` : ''}
                </Text>
                {venue.address && (
                  <TouchableOpacity onPress={handleAddressPress} style={{ marginTop: 4 }}>
                    <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
                      {venue.address}
                    </Text>
                    <Text variant="caption" style={{ color: theme.colors.primary[500], marginTop: 2 }}>
                      Tap to open in maps →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Description */}
              {venue.description && (
                <View style={[styles.infoSection, { borderTopColor: theme.colors.border.light }]}>
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginBottom: 4 }}>
                    ABOUT
                  </Text>
                  <Text variant="body1" style={{ color: theme.colors.text.secondary, lineHeight: 22 }}>
                    {venue.description}
                  </Text>
                </View>
              )}

              {/* Website */}
              {venue.url && (
                <TouchableOpacity
                  style={[styles.websiteButton, {
                    backgroundColor: theme.colors.background.primary,
                    borderColor: theme.colors.border.light,
                  }]}
                  onPress={handleWebsitePress}
                >
                  <Text variant="body1" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
                    🔗 Visit Website
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Upcoming Events Section */}
            <View style={[styles.eventsSection, { backgroundColor: theme.colors.background.secondary }]}>
              <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: 16 }}>
                Upcoming Events
              </Text>

              {upcomingEvents.length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <Text variant="body1" color="secondary" style={{ textAlign: 'center' }}>
                    No upcoming events scheduled at this venue.
                  </Text>
                </View>
              ) : (
                upcomingEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, {
                      backgroundColor: theme.colors.background.primary,
                      borderColor: theme.colors.border.light,
                    }]}
                    onPress={() => handleEventPress(event.id)}
                  >
                    {event.image_url && (
                      <Image
                        source={{ uri: event.image_url }}
                        style={styles.eventImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.eventInfo}>
                      <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }} numberOfLines={2}>
                        {event.title}
                      </Text>
                      {event.event_date && (
                        <Text variant="caption" style={{ color: theme.colors.primary[500], marginTop: 4 }}>
                          📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {event.start_time && ` • ${formatMilitaryTime(event.start_time)}`}
                        </Text>
                      )}
                      {event.price && (
                        <Text variant="caption" style={{ color: theme.colors.text.secondary, marginTop: 2 }}>
                          {event.price}
                        </Text>
                      )}
                    </View>
                    <Text variant="body2" style={{ color: theme.colors.text.tertiary }}>›</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </PageView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  venueImage: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 110,
    alignItems: 'center',
  },
  infoSection: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  websiteButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  eventsSection: {
    borderRadius: 16,
    padding: 20,
  },
  noEventsContainer: {
    paddingVertical: 24,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  eventImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
});
