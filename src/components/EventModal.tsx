import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import type { Venue } from '../types/venues';
import type { Event } from '../types/events';
import { getVenueByName, getVenueById, getVenuesByCity } from '../api/venues';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import { getDisplayCityName } from '../utils/cityUtils';

interface EventModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
}

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

const EventModal: React.FC<EventModalProps> = ({ visible, event, onClose }) => {
  const { theme } = useTheme();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullVenueDescription, setShowFullVenueDescription] = useState(false);

  useEffect(() => {
    if (visible && event) {
      fetchVenueData();
    }
  }, [visible, event]);

    const fetchVenueData = async () => {
    if (!event) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // For now, since events no longer have direct venue relationships,
      // we'll show venues in the same city as the event
      const venuesInCity = await getVenuesByCity(event.city);
      
      if (venuesInCity.length > 0) {
        setVenue(venuesInCity.find(venue => venue.id === event.venue_id) ?? null);
      } else {
        setError('No venues found in this city');
      }
    } catch (err) {
      console.error('Error fetching venues:', err);
      setError('Failed to load venue information');
    } finally {
      setLoading(false);
    }
  };

  const handleEventLink = () => {
    // Prioritize detail_page_url, fallback to root_url
    const linkUrl = event?.detail_page_url || event?.root_url;
    if (linkUrl) {
      Linking.openURL(linkUrl);
    }
  };

  const handleAddressPress = () => {
    if (venue?.address) {
      const encodedAddress = encodeURIComponent(venue.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      Linking.openURL(mapsUrl);
    }
  };

  // Get image source with same priority as EventCard: event image -> venue image -> default
  const getImageSource = () => {
    if (event?.image_url) {
      return { uri: event.image_url };
    }
    if (venue?.image) {
      return { uri: venue.image };
    }
    return require('../../assets/record.png');
  };

  // Get display genre from event music info
  const getDisplayGenre = () => {
    if (event?.music_info && event.music_info.genres) {
      if (Array.isArray(event.music_info.genres)) {
        return event.music_info.genres[0];
      } else if (typeof event.music_info.genres === 'string') {
        return event.music_info.genres;
      }
    }
    return null;
  };

  // Get venue size label
  const getVenueSizeLabel = (size: string) => {
    switch (size?.toLowerCase()) {
      case 'small': return 'Small Venue (< 50 people)';
      case 'medium': return 'Medium Venue (50-200 people)';
      case 'large': return 'Large Venue (200+ people)';
      default: return size ? `${size} Venue` : null;
    }
  };

  const displayGenre = getDisplayGenre();
  const venueSizeLabel = venue?.venue_size ? getVenueSizeLabel(venue.venue_size) : null;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: theme.colors.border.light,
          backgroundColor: theme.colors.background.primary,
          ...theme.shadows.small,
        }]}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: theme.colors.gray[100] }]} 
            onPress={onClose}
          >
            <Text variant="body1" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text variant="h3" style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Event Details
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text variant="body1" style={[styles.loadingText, { 
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.md,
              }]}>
                Loading venue information...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text variant="h3" style={[styles.errorText, { 
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.sm,
              }]}>
                😔 {error}
              </Text>
              <Text variant="body1" style={{ color: theme.colors.text.tertiary }}>
                We couldn't find detailed information for this venue.
              </Text>
            </View>
          )}

          {venue && event && (
            <View style={styles.content}>
              {/* Main Event Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={getImageSource()}
                  style={[styles.eventImage, { backgroundColor: theme.colors.gray[100] }]}
                  resizeMode="contain"
                />
                
                {/* Genre Badge */}
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
                  
                  {(event.start_time || event.end_time) && (
                    <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                      <Text style={[styles.metaIcon, { color: theme.colors.secondary[500] }]}>🕐</Text>
                      <Text variant="body1" style={{
                        color: theme.colors.text.primary,
                        fontWeight: '600',
                      }}>
                        {event.start_time && formatMilitaryTime(event.start_time)}
                        {event.start_time && event.end_time && ' - '}
                        {event.end_time && formatMilitaryTime(event.end_time)}
                      </Text>
                    </View>
                  )}

                  {event.city && (
                    <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                      <Text style={[styles.metaIcon, { color: theme.colors.text.secondary }]}>🏙️</Text>
                      <Text variant="body1" style={{
                        color: theme.colors.text.secondary,
                        fontWeight: '500',
                      }}>
                        {getDisplayCityName(event.city)}
                      </Text>
                    </View>
                  )}

                  {/* Show music genres if available */}
                  {event.music_info?.genres && (
                    <View style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}>
                      <Text style={[styles.metaIcon, { color: theme.colors.primary[500] }]}>🎵</Text>
                      <Text variant="body1" style={{
                        color: theme.colors.text.secondary,
                        fontWeight: '500',
                      }}>
                        {Array.isArray(event.music_info.genres) 
                          ? event.music_info.genres.join(', ')
                          : event.music_info.genres
                        }
                      </Text>
                    </View>
                  )}
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
                  }} numberOfLines={showFullDescription ? undefined : 6}>
                    {event.description || 'A magical theatrical experience for the whole family featuring beloved characters and enchanting performances. Join us for an unforgettable evening of entertainment that will leave you spellbound and amazed.'}
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
                </View>

                {/* Venue Information Section */}
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

                  <View style={styles.venueContentContainer}>
                    {/* Venue thumbnail - larger and positioned to wrap with text */}
                    {venue.image && (
                      <Image
                        source={{ uri: venue.image }}
                        style={[styles.venueThumbnail, { 
                          backgroundColor: theme.colors.gray[100],
                          borderRadius: theme.borderRadius.md,
                        }]}
                        resizeMode="cover"
                      />
                    )}
                    
                    <View style={styles.venueTextContent}>
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
                    </View>
                  </View>
                  
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

                {/* Action Button */}
                {(event?.detail_page_url || event?.root_url) && (
                  <View style={[styles.actionButtons, { 
                    marginTop: theme.spacing.lg,
                  }]}>
                    <TouchableOpacity
                      style={[styles.primaryActionButton, {
                        backgroundColor: theme.colors.secondary[500],
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.lg,
                        borderRadius: theme.borderRadius.lg,
                        alignItems: 'center',
                        ...theme.shadows.small,
                      }]}
                      onPress={handleEventLink}
                    >
                      <Text variant="body1" style={{ 
                        color: theme.colors.text.inverse, 
                        fontWeight: '600',
                        textAlign: 'center',
                      }}>
                        🎫 View Event Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

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
  closeButton: {
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
  headerSpacer: {
    width: 32,
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
    height: 200, // Reduced height to prevent cutoff
    backgroundColor: '#f0f0f0',
  },
  genreBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  venueContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  venueTextContent: {
    flex: 1,
    marginLeft: 12,
  },
  venueThumbnail: {
    width: 80,  // Much larger thumbnail
    height: 80,
    borderRadius: 8,
  },
  venueTypeContainer: {},
  venueTypeBadge: {},
  addressContainer: {},
  venueDescriptionContainer: {},
  actionButtons: {},
  primaryActionButton: {
    alignItems: 'center',
  },
  
  // Legacy styles (keeping for compatibility)
  venueImage: {
    width: '100%',
    height: 250,
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  venueInfo: {},
  venueName: {},
  descriptionContainer: {},
  eventSection: {},
  eventCard: {},
  eventMeta: {},
  actionButton: {
    alignItems: 'center',
  },
});

export default EventModal;