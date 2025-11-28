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
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Venue } from '../../types/venues';
import type { Event } from '../../types/events';
import { getEventById } from '../../api/events';
import { getVenueById, getVenuesByCity } from '../../api/venues';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/ui';
import { getVenueSizeLabel } from '../../utils/venueUtils';
import { EVENT_NO_DESCRIPTION_FALLBACK } from '../../utils/eventUtils';
import { logger } from '../../utils/logger';
import { getGenresFromEventTypes, getGenreDisplayLabel } from '../../constants/eventCategories';
import { analytics } from '../../utils/analytics';
import { useModalTimeTracking } from '../../hooks/useTimeTracking';
import { addToGoogleCalendar, addToAppleCalendar } from '../../utils/calendarUtils';
import { useAuth } from '../../hooks/useAuth';
import { EventPageSchema } from '../../components/EventPageSchema';

const { width, height } = Dimensions.get('window');

// Helper function to format time like in EventCard
function formatMilitaryTime(time: string): string {
  if (!time || typeof time !== 'string' || !time.includes(':')) {
    return time;
  }

  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return time;
  }

  const isPM = hours >= 12;
  const formattedHours = isPM ? (hours === 12 ? 12 : hours - 12) : (hours === 0 ? 12 : hours);
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes} ${isPM ? 'PM' : 'AM'}`;
}

export default function EventPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullVenueDescription, setShowFullVenueDescription] = useState(false);
  const { getDuration } = useModalTimeTracking();

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id]);

  useEffect(() => {
    if (event) {
      // Track page view
      analytics.trackEventMetric({
        eventId: event.id,
        metricType: 'detail_view',
        city: event.city,
        metadata: {
          hasVenue: !!event.venue_id,
        },
      });
    }

    return () => {
      if (event) {
        // Track duration on unmount
        const duration = getDuration();
        analytics.trackEventMetric({
          eventId: event.id,
          metricType: 'detail_close',
          city: event.city,
          durationMs: duration,
          metadata: {
            viewedVenue: !!venue,
          },
        });
      }
    };
  }, [event]);

  const fetchEventData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch event
      const eventData = await getEventById(id);
      
      if (!eventData) {
        setError('Event not found');
        setLoading(false);
        return;
      }
      
      setEvent(eventData);
      
      // Fetch venue if available
      if (eventData.venue_id) {
        try {
          const venueData = await getVenueById(eventData.venue_id);
          if (venueData) {
            setVenue(venueData);
          }
        } catch (venueError) {
          logger.warn('Could not fetch venue:', venueError);
          // Try to find venue in same city as fallback
          const venuesInCity = await getVenuesByCity(eventData.city);
          const matchedVenue = venuesInCity.find(v => v.id === eventData.venue_id);
          if (matchedVenue) {
            setVenue(matchedVenue);
          }
        }
      }
    } catch (err) {
      logger.error('Error fetching event data:', err);
      setError('Failed to load event information');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Check if we can go back in history
    if (Platform.OS === 'web' && typeof globalThis.window !== 'undefined') {
      if (globalThis.window.history.length > 1) {
        router.back();
      } else {
        // No history, navigate to home
        router.push('/');
      }
    } else {
      // On mobile, canGoBack should work
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/');
      }
    }
  };

  const handleShare = async () => {
    if (!event) return;
    
    // Build share URL - update this with your actual domain
    const baseUrl = Platform.OS === 'web' && typeof globalThis.window !== 'undefined'
      ? globalThis.window.location.origin
      : 'https://findlocal.app'; // Replace with your actual domain
    
    const shareUrl = `${baseUrl}/event/${event.id}`;
    
    const eventDateStr = event.event_date 
      ? ` on ${new Date(event.event_date).toLocaleDateString()}`
      : '';
    const message = `Check out ${event.title}${eventDateStr}`;
    
    try {
      // Track share attempt
      analytics.trackEventMetric({
        eventId: event.id,
        metricType: 'share',
        city: event.city,
        metadata: {
          platform: Platform.OS,
        },
      });

      if (Platform.OS === 'web') {
        // For web, try to use the Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: event.title,
            text: message,
            url: shareUrl,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
        }
      } else {
        // For mobile, use React Native Share API
        await Share.share({
          message: `${message}\n${shareUrl}`,
          url: shareUrl,
          title: event.title,
        });
      }
    } catch (err: any) {
      // User cancelled or error occurred
      if (err.message !== 'User cancelled') {
        logger.error('Error sharing event:', err);
      }
    }
  };

  const handleEventLink = () => {
    if (!event) return;
    
    // Priority: ticket_page_url -> detail_page_url -> root_url -> venue.url
    const linkUrl = event.ticket_page_url || event.detail_page_url || event.root_url || venue?.url;
    if (linkUrl) {
      Linking.openURL(linkUrl);
    }
  };

  // Get button text and indicator based on available URLs
  const getButtonInfo = () => {
    if (event?.ticket_page_url) {
      return { text: '🎫 Buy Tickets', showExternal: false };
    }
    if (event?.detail_page_url || event?.root_url) {
      return { text: 'Event Website →', showExternal: true };
    }
    return { text: 'Venue Website →', showExternal: true };
  };

  const handleAddressPress = () => {
    if (venue?.address) {
      const encodedAddress = encodeURIComponent(venue.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      Linking.openURL(mapsUrl);
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!event) return;
    
    analytics.trackEventMetric({
      eventId: event.id,
      metricType: 'calendar_export',
      city: event.city,
      metadata: {
        calendarType: 'google',
        hasVenue: !!venue,
      },
    });
    
    addToGoogleCalendar(event, venue);
  };

  const handleAddToAppleCalendar = () => {
    if (!event) return;
    
    analytics.trackEventMetric({
      eventId: event.id,
      metricType: 'calendar_export',
      city: event.city,
      metadata: {
        calendarType: 'apple',
        hasVenue: !!venue,
      },
    });
    
    addToAppleCalendar(event, venue);
  };

  // Get image source with same priority as EventCard: event image -> venue image -> default
  const getImageSource = () => {
    if (event?.image_url) {
      return { uri: event.image_url };
    }
    if (venue?.image) {
      return { uri: venue.image };
    }
    return require('../../../assets/record.png');
  };

  // Get display genre from event event_type array
  const getDisplayGenre = () => {
    if (!event) return null;
    const genres = getGenresFromEventTypes(event.event_type);
    if (genres.length > 0) {
      return getGenreDisplayLabel(genres[0]);
    }
    return null;
  };

  const displayGenre = getDisplayGenre();
  const venueSizeLabel = venue?.venue_size ? getVenueSizeLabel(venue.venue_size) : null;
  const buttonInfo = getButtonInfo();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body1" style={[styles.loadingText, { 
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.md,
          }]}>
            Loading event...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.errorContainer}>
          <Text variant="h3" style={[styles.errorText, { 
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
          }]}>
            😔 {error || 'Event not found'}
          </Text>
          <TouchableOpacity 
            onPress={handleBack}
            style={[styles.backButton, {
              backgroundColor: theme.colors.primary[500],
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.borderRadius.md,
              marginTop: theme.spacing.lg,
            }]}
          >
            <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
              ← Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* SEO and structured data */}
      <EventPageSchema event={event} venue={venue} />
      
      {/* Header */}
      <View style={[styles.header, {
        borderBottomColor: theme.colors.border.light,
        backgroundColor: theme.colors.background.primary,
        ...theme.shadows.small,
      }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.colors.gray[100] }]} 
          onPress={handleBack}
        >
          <Text variant="body1" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text variant="h3" style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Event Details
        </Text>
        <TouchableOpacity 
          style={[styles.shareButton, { backgroundColor: theme.colors.primary[100] }]} 
          onPress={handleShare}
        >
          <Text variant="body1" style={{ color: theme.colors.primary[600], fontWeight: '600' }}>
            ⤴
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Main Event Image */}
          <View style={styles.imageContainer}>
            <Image
              source={getImageSource()}
              style={[styles.eventImage, { backgroundColor: theme.colors.gray[100] }]}
              resizeMode="contain"
            />
            
            {/* Price badge - top right */}
            {event.price && (
              <View style={[styles.priceBadge, {
                backgroundColor: theme.colors.background.primary,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.md,
                ...theme.shadows.small,
              }]}>
                <Text variant="body2" style={{
                  color: theme.colors.text.primary,
                  fontWeight: '700',
                }}>
                  {event.price}
                </Text>
              </View>
            )}

            {/* Status badge - below price or top right if no price */}
            {event.status && (
              <View style={[styles.statusBadge, {
                backgroundColor: event.status.toLowerCase().includes('sold') 
                  ? theme.colors.error 
                  : event.status.toLowerCase().includes('cancel') || event.status.toLowerCase().includes('postpon')
                  ? theme.colors.warning
                  : theme.colors.success,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.md,
                top: event.price ? 48 : 8,
                ...theme.shadows.medium,
              }]}>
                <Text variant="caption" style={{
                  color: theme.colors.text.inverse,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}>
                  {event.status}
                </Text>
              </View>
            )}
            
            {/* Genre Badge - bottom left */}
            {displayGenre && (
              <View style={[styles.genreBadge, {
                backgroundColor: theme.colors.primary[600],
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.full,
                ...theme.shadows.small,
              }]}>
                <Text variant="caption" style={{
                  color: theme.colors.text.inverse,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}>
                  {displayGenre}
                </Text>
              </View>
            )}
          </View>

          {/* Event Information */}
          <View style={[styles.eventInfo, { padding: theme.spacing.lg }]}>
            <Text variant="h1" style={[styles.eventTitle, { 
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.sm,
            }]}>
              {event.title}
            </Text>
            
            {/* Event Meta Info */}
            <View style={[styles.eventMetaContainer, { marginBottom: theme.spacing.lg }]}>
              {event.event_date && (
                <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                  <Text style={[styles.metaIcon, { color: theme.colors.primary[600] }]}>📅</Text>
                  <Text variant="body1" style={{
                    color: theme.colors.text.primary,
                    fontWeight: '600',
                  }}>
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}
              
              {event.start_time && (
                <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                  <Text style={[styles.metaIcon, { color: theme.colors.secondary[500] }]}>🕐</Text>
                  <Text variant="body1" style={{
                    color: theme.colors.text.primary,
                    fontWeight: '600',
                  }}>
                    {formatMilitaryTime(event.start_time)}
                  </Text>
                </View>
              )}

              {venue?.address && (
                <TouchableOpacity 
                  style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}
                  onPress={handleAddressPress}
                >
                  <Text style={[styles.metaIcon, { color: theme.colors.text.secondary }]}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="body1" style={{
                      color: theme.colors.text.primary,
                      fontWeight: '600',
                    }}>
                      {venue.address}
                    </Text>
                    <Text variant="caption" style={{
                      color: theme.colors.primary[600],
                      fontStyle: 'italic',
                    }}>
                      Tap to open in maps
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Primary Action Button */}
              <TouchableOpacity
                style={[styles.primaryActionButton, {
                  backgroundColor: theme.colors.secondary[500],
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.borderRadius.lg,
                  alignItems: 'center',
                  marginTop: theme.spacing.sm,
                  marginBottom: theme.spacing.md,
                  ...theme.shadows.medium,
                }]}
                onPress={handleEventLink}
              >
                <Text variant="body1" style={{ 
                  color: theme.colors.text.inverse, 
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: 16,
                }}>
                  {buttonInfo.text}
                </Text>
              </TouchableOpacity>

              {/* Add to Calendar Buttons - Only visible for logged in users */}
              {isLoggedIn && event.event_date && (
                <View style={[styles.calendarButtonsContainer, { marginBottom: theme.spacing.md }]}>
                  <Text variant="body2" style={{ 
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.sm,
                    fontWeight: '600',
                  }}>
                    Add to Calendar
                  </Text>
                  <View style={styles.calendarButtons}>
                    <TouchableOpacity
                      style={[styles.calendarButton, {
                        backgroundColor: theme.colors.background.primary,
                        borderColor: theme.colors.primary[500],
                        borderWidth: 1.5,
                        paddingVertical: theme.spacing.sm,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.borderRadius.md,
                        flex: 1,
                        marginRight: theme.spacing.xs,
                        alignItems: 'center',
                      }]}
                      onPress={handleAddToGoogleCalendar}
                    >
                      <Text variant="body2" style={{ 
                        color: theme.colors.primary[600], 
                        fontWeight: '600',
                        fontSize: 13,
                      }}>
                        📅 Google
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.calendarButton, {
                        backgroundColor: theme.colors.background.primary,
                        borderColor: theme.colors.primary[500],
                        borderWidth: 1.5,
                        paddingVertical: theme.spacing.sm,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.borderRadius.md,
                        flex: 1,
                        marginLeft: theme.spacing.xs,
                        alignItems: 'center',
                      }]}
                      onPress={handleAddToAppleCalendar}
                    >
                      <Text variant="body2" style={{ 
                        color: theme.colors.primary[600], 
                        fontWeight: '600',
                        fontSize: 13,
                      }}>
                        📅 Apple
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Show music genres if available */}
              {(() => {
                const genres = getGenresFromEventTypes(event.event_type);
                if (genres.length > 0) {
                  return (
                    <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                      <Text style={[styles.metaIcon, { color: theme.colors.primary[500] }]}>🎵</Text>
                      <Text variant="body1" style={{
                        color: theme.colors.text.secondary,
                        fontWeight: '500',
                      }}>
                        {genres.map(g => getGenreDisplayLabel(g)).join(', ')}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
            </View>

            {/* Event Description */}
            <View style={[styles.descriptionSection, { 
              backgroundColor: theme.colors.background.secondary,
              padding: theme.spacing.lg,
              borderRadius: theme.borderRadius.lg,
              marginBottom: theme.spacing.lg,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.primary[500],
            }]}>
              <Text variant="h4" style={{
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.md,
                fontWeight: '600',
              }}>
                About this event
              </Text>
              <Text variant="body1" style={{
                color: theme.colors.text.secondary,
                lineHeight: 24,
                fontSize: 16,
                fontStyle: event.description ? 'normal' : 'italic',
              }} numberOfLines={showFullDescription ? undefined : 6}>
                {event.description || EVENT_NO_DESCRIPTION_FALLBACK}
              </Text>
              {(event.description && event.description.length > 300) && (
                <TouchableOpacity 
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  style={{ 
                    marginTop: theme.spacing.md,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text variant="body1" style={{
                    color: theme.colors.primary[600],
                    fontWeight: '700',
                  }}>
                    {showFullDescription ? '← Show Less' : 'Read More →'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Link to event detail page or venue website */}
              {(event.detail_page_url || event.root_url || venue?.url) && (
                <TouchableOpacity 
                  onPress={() => {
                    const url = (event.detail_page_url && event.detail_page_url !== event.ticket_page_url)
                      ? event.detail_page_url
                      : event.root_url || venue?.url;
                    if (url) Linking.openURL(url);
                  }}
                  style={{ 
                    marginTop: theme.spacing.md,
                    paddingTop: theme.spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border.light,
                  }}
                >
                  <Text variant="body2" style={{
                    color: theme.colors.primary[600],
                    fontWeight: '600',
                  }}>
                    {(event.detail_page_url && event.detail_page_url !== event.ticket_page_url) || event.root_url 
                      ? '🔗 View original posting →' 
                      : '🔗 Visit venue website →'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Venue Information Section */}
            {venue && (
              <View style={[styles.venueSection, { 
                backgroundColor: theme.colors.background.secondary,
                padding: theme.spacing.lg,
                borderRadius: theme.borderRadius.lg,
                marginBottom: theme.spacing.lg,
              }]}>
                <Text variant="h3" style={{
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                }}>
                  Venue Information
                </Text>

                {/* Venue thumbnail */}
                {venue.image && (
                  <Image
                    source={{ uri: venue.image }}
                    style={[styles.venueThumbnail, { 
                      backgroundColor: theme.colors.gray[100],
                      borderRadius: theme.borderRadius.md,
                      marginBottom: theme.spacing.md,
                      width: '100%',
                      height: 150,
                    }]}
                    resizeMode="cover"
                  />
                )}

                <Text variant="h4" style={{
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.xs,
                  fontWeight: '600',
                }}>
                  {venue.name}
                </Text>

                {venue.type && (
                  <View style={[styles.venueTypeBadge, {
                    backgroundColor: theme.colors.primary[100],
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    borderRadius: theme.borderRadius.md,
                    alignSelf: 'flex-start',
                    marginBottom: theme.spacing.sm,
                  }]}>
                    <Text variant="caption" style={{
                      color: theme.colors.primary[700],
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}>
                      {venue.type}
                    </Text>
                  </View>
                )}

                {venueSizeLabel && (
                  <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                    <Text style={[styles.metaIcon, { color: theme.colors.text.secondary }]}>👥</Text>
                    <Text variant="body2" style={{
                      color: theme.colors.text.secondary,
                      fontStyle: 'italic',
                    }}>
                      {venueSizeLabel}
                    </Text>
                  </View>
                )}
                
                {venue.address && (
                  <TouchableOpacity 
                    style={[styles.addressContainer, {
                      backgroundColor: theme.colors.background.primary,
                      padding: theme.spacing.md,
                      borderRadius: theme.borderRadius.md,
                      marginTop: theme.spacing.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border.light,
                    }]}
                    onPress={handleAddressPress}
                  >
                    <View style={[styles.metaRow, { marginBottom: theme.spacing.xs }]}>
                      <Text style={[styles.metaIcon, { color: theme.colors.text.secondary }]}>📍</Text>
                      <Text variant="caption" style={{
                        color: theme.colors.text.tertiary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}>
                        Address
                      </Text>
                    </View>
                    <Text variant="body1" style={{
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.xs,
                      marginLeft: 20,
                    }}>
                      {venue.address}
                    </Text>
                    <Text variant="caption" style={{
                      color: theme.colors.primary[600],
                      fontStyle: 'italic',
                      marginLeft: 20,
                    }}>
                      Tap to open in maps
                    </Text>
                  </TouchableOpacity>
                )}

                {venue.description && (
                  <View style={[styles.venueDescriptionContainer, { marginTop: theme.spacing.md }]}>
                    <Text variant="body2" style={{
                      color: theme.colors.text.secondary,
                      lineHeight: 20,
                      marginBottom: theme.spacing.sm,
                    }} numberOfLines={showFullVenueDescription ? undefined : 3}>
                      {venue.description}
                    </Text>
                    {venue.description.length > 150 && (
                      <TouchableOpacity 
                        onPress={() => setShowFullVenueDescription(!showFullVenueDescription)}
                      >
                        <Text variant="body2" style={{
                          color: theme.colors.primary[600],
                          fontWeight: '600',
                        }}>
                          {showFullVenueDescription ? 'Show Less' : 'Read More'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    borderRadius: 9999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    borderRadius: 9999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {},
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorText: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statusBadge: {
    position: 'absolute',
    right: 8,
  },
  genreBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  eventInfo: {},
  eventTitle: {},
  eventMetaContainer: {},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  descriptionSection: {},
  venueSection: {},
  venueThumbnail: {},
  venueTypeBadge: {},
  addressContainer: {},
  venueDescriptionContainer: {},
  primaryActionButton: {},
  calendarButtonsContainer: {},
  calendarButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarButton: {},
});
