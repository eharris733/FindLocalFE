import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Linking, StyleSheet, Platform, Alert, Pressable } from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { useTheme } from '../context/ThemeContext';
import { Text, Card } from './ui';
import { getVenueById } from '../api/venues';
import { getDisplayCityName } from '../utils/cityUtils';
import { getCompactVenueSizeLabel } from '../utils/venueUtils';
import { EVENT_NO_DESCRIPTION_FALLBACK } from '../utils/eventUtils';

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
  variant?: 'default' | 'compact';
  venues?: Venue[]; // Optional venue list for faster lookup
}

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

const EventCard: React.FC<EventCardProps> = ({ event, onPress, variant = 'default', venues }) => {
  const { theme } = useTheme();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Look up venue information if event has a venue_id
  useEffect(() => {
    const lookupVenue = async () => {
      if (!event.venue_id) {
        setVenue(null);
        return;
      }

      // First try to find venue in the provided venues array (faster)
      if (venues) {
        const foundVenue = venues.find(v => v.id === event.venue_id);
        if (foundVenue) {
          setVenue(foundVenue);
          return;
        }
      }

      // If not found in provided venues array, fetch from API
      try {
        const venueData = await getVenueById(event.venue_id);
        setVenue(venueData);
      } catch (error) {
        console.error('Error fetching venue:', error);
        setVenue(null);
      }
    };

    lookupVenue();
  }, [event.venue_id, venues]);

  // Get the venue information for display
  const getVenueInfo = () => {
    return {
      name: venue?.name || null,
      address: venue?.address || getDisplayCityName(event.city),
      size: venue?.venue_size || null,
      sizeLabel: venue?.venue_size ? getCompactVenueSizeLabel(venue.venue_size) : null,
      type: venue?.type || null,
      image: venue?.image || null
    };
  };
  
  const handleCardPress = () => {
    if (onPress) {
      onPress(event);
    } else if (event.detail_page_url) {
      Linking.openURL(event.detail_page_url);
    }
  };

  // Priority: event image -> venue image -> default music icon
  const imageSource = event.image_url 
    ? { uri: event.image_url }
    : venue?.image
    ? { uri: venue.image }
    : require('../../assets/record.png');

  // Extract first genre from music_info for display
  const getDisplayGenre = () => {
    if (event.music_info && event.music_info.genres) {
      if (Array.isArray(event.music_info.genres)) {
        return event.music_info.genres[0];
      } else if (typeof event.music_info.genres === 'string') {
        return event.music_info.genres;
      }
    }
    return null;
  };

  const displayGenre = getDisplayGenre();

  // Mock pricing data - COMMENTED OUT until we have real price data
  // const getMockPrice = () => {
  //   const prices = ['Free', '$30', '$45', '$35', '$20'];
  //   return prices[Math.floor(Math.random() * prices.length)];
  // };

  // const eventPrice = getMockPrice();

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handleCardPress}>
        <View style={[styles.compactCard, { 
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
        }]}>
          <Image
            source={imageSource}
            style={[styles.compactImage, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />
          
          <View style={styles.compactContent}>
            <Text variant="body1" numberOfLines={2} style={styles.compactTitle}>
              {event.title || 'Untitled Event'}
            </Text>
            
            {(() => {
              const venueInfo = getVenueInfo();
              return (
                <View style={styles.compactVenueContainer}>
                  <Text variant="body2" style={styles.compactVenueIcon}>📍</Text>
                  <View style={styles.compactVenueTextContainer}>
                    {venueInfo.name && (
                      <Text variant="caption" color="primary" numberOfLines={1} style={styles.compactVenueName}>
                        {venueInfo.name}
                      </Text>
                    )}
                    <Text variant="caption" color="secondary" numberOfLines={1} style={styles.compactVenueAddress}>
                      {venueInfo.address}
                    </Text>
                    {(venueInfo.sizeLabel || venueInfo.type) && (
                      <Text variant="caption" color="secondary" numberOfLines={1} style={styles.compactVenueType}>
                        {[venueInfo.sizeLabel, venueInfo.type].filter(Boolean).join(' • ')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })()}
            
            <View style={styles.compactMeta}>
              {event.event_date && (
                <Text variant="caption" style={[styles.compactDate, { color: theme.colors.primary[600] }]}>
                  {format(new Date(event.event_date), 'MMM dd')}
                </Text>
              )}
              {event.start_time && (
                <Text variant="caption" style={[styles.compactTime, { color: theme.colors.secondary[500] }]}>
                  {formatMilitaryTime(event.start_time)}
                </Text>
              )}
              {displayGenre && (
                <View style={[styles.compactCategory, { backgroundColor: theme.colors.accent[500] }]}>
                  <Text variant="caption" color="inverse" style={styles.compactCategoryText}>
                    {displayGenre}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Updated default variant to match mockup design exactly
  return (
    <TouchableOpacity onPress={handleCardPress}>
      <View style={[styles.mockupCard, { 
        backgroundColor: theme.colors.background.primary,
        borderColor: theme.colors.border.light,
        ...theme.shadows.small,
      }]}>
        {/* Image with overlay elements */}
        <View style={styles.mockupImageContainer}>
          <Image
            source={imageSource}
            style={[styles.mockupImage, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />
          {/* Price tag in top-right corner - COMMENTED OUT until we have real price data */}
          {/* <View style={[styles.mockupPriceTag, { backgroundColor: theme.colors.background.primary }]}>
            <Text style={[styles.mockupPriceText, { color: theme.colors.text.primary }]}>
              {eventPrice}
            </Text>
          </View> */}
          {/* Category tag in bottom-left */}
          {displayGenre && (
            <View style={[styles.mockupCategoryTag, { backgroundColor: theme.colors.primary[600] }]}>
              <Text style={[styles.mockupCategoryText, { color: theme.colors.text.inverse }]}>
                {displayGenre}
              </Text>
            </View>
          )}
        </View>
        
        {/* Event details */}
        <View style={styles.mockupContent}>
          <Text style={[styles.mockupTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>
            {event.title || 'Untitled Event'}
          </Text>
          
          <Text style={[styles.mockupDescription, { 
            color: theme.colors.text.secondary,
            fontStyle: event.description ? 'normal' : 'italic',
          }]} numberOfLines={2}>
            {event.description || EVENT_NO_DESCRIPTION_FALLBACK}
          </Text>
          
          <View style={styles.mockupVenueRow}>
            <Text style={[styles.mockupVenueIcon, { color: theme.colors.text.secondary }]}>📍</Text>
            <View style={styles.mockupVenueTextContainer}>
              {(() => {
                const venueInfo = getVenueInfo();
                return (
                  <>
                    {venueInfo.name && (
                      <Text style={[styles.mockupVenueName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                        {venueInfo.name}
                      </Text>
                    )}
                    <Text style={[styles.mockupVenueAddress, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                      {venueInfo.address}
                    </Text>
                  </>
                );
              })()}
            </View>
          </View>
          
          <View style={styles.mockupMetaRow}>
            {event.event_date && (
              <View style={styles.mockupDateContainer}>
                <Text style={[styles.mockupDateIcon, { color: theme.colors.text.secondary }]}>📅</Text>
                <Text style={[styles.mockupDateText, { color: theme.colors.text.secondary }]}>
                  {format(new Date(event.event_date), 'MMM dd')}
                </Text>
              </View>
            )}
            {event.start_time && (
              <View style={styles.mockupTimeContainer}>
                <Text style={[styles.mockupTimeIcon, { color: theme.colors.text.secondary }]}>🕐</Text>
                <Text style={[styles.mockupTimeText, { color: theme.colors.text.secondary }]}>
                  {formatMilitaryTime(event.start_time)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.mockupVenueTypeRow}>
            {(() => {
              const venueInfo = getVenueInfo();
              const sizeText = venueInfo.sizeLabel || 'Unknown size';
              const typeText = venueInfo.type || 'Venue';
              return (
                <Text style={[styles.mockupVenueType, { color: theme.colors.text.secondary }]}>
                  🏢 {sizeText} • {typeText}
                </Text>
              );
            })()}
          </View>
          
          {/* Action buttons */}
          <View style={styles.mockupButtonRow}>
            <TouchableOpacity 
              style={[styles.mockupViewButton, { backgroundColor: theme.colors.primary[600] }]}
              onPress={handleCardPress}
            >
              <Text style={[styles.mockupViewButtonText, { color: theme.colors.text.inverse }]}>
                View Details
              </Text>
            </TouchableOpacity>
            <View style={{ position: 'relative' }}>
              <Pressable
                style={[styles.mockupShareButton, { 
                  borderColor: theme.colors.border.light,
                  backgroundColor: theme.colors.background.tertiary,
                  opacity: 0.5,
                }]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    setShowTooltip(!showTooltip);
                    // Auto-hide tooltip after 2 seconds on mobile
                    setTimeout(() => setShowTooltip(false), 2000);
                  }
                }}
                onHoverIn={Platform.OS === 'web' ? () => setShowTooltip(true) : undefined}
                onHoverOut={Platform.OS === 'web' ? () => setShowTooltip(false) : undefined}
                onPressIn={Platform.OS === 'web' ? () => setShowTooltip(true) : undefined}
                onPressOut={Platform.OS === 'web' ? undefined : undefined}
              >
                <Text style={[styles.mockupShareButtonText, { color: theme.colors.text.tertiary }]}>
                  🔗 Share
                </Text>
              </Pressable>
              
              {/* Tooltip */}
              {showTooltip && (
                <View style={[styles.tooltip, {
                  backgroundColor: theme.colors.gray[900],
                  shadowColor: theme.colors.gray[900],
                }]}>
                  <Text style={[styles.tooltipText, { color: theme.colors.text.inverse }]}>
                    Coming soon!
                  </Text>
                  <View style={[styles.tooltipArrow, { borderTopColor: theme.colors.gray[900] }]} />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Default variant styles
  card: {
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  title: {
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontWeight: '600',
    marginRight: 16,
  },
  time: {
    fontWeight: '600',
  },
  venueContainer: {
    marginBottom: 8,
  },
  venue: {
    fontStyle: 'italic',
  },
  venueHint: {
    fontStyle: 'italic',
    marginTop: 2,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  category: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    lineHeight: 18,
  },
  
  // Modern card design styles
  cardContainer: {
    position: 'relative',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    marginBottom: 12,
  },
  modernImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  priceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  priceText: {
    fontWeight: '600',
    fontSize: 14,
  },
  categoryTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 10,
  },
  modernContent: {
    paddingHorizontal: 4,
  },
  modernTitle: {
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 16,
  },
  modernDescription: {
    marginBottom: 12,
    lineHeight: 18,
  },
  modernMeta: {
    marginBottom: 12,
  },
  modernVenue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  venueIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  modernVenueText: {
    fontSize: 12,
  },
  modernDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernDate: {
    fontSize: 12,
  },
  modernTime: {
    fontSize: 12,
  },
  modernFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  venueSize: {
    fontSize: 12,
    flex: 1,
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  detailsButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  shareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  shareButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  
  // Compact variant styles
  compactCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  compactVenue: {
    marginBottom: 4,
  },
  compactVenueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  compactVenueIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  compactVenueTextContainer: {
    flex: 1,
  },
  compactVenueName: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 2,
  },
  compactVenueAddress: {
    fontSize: 11,
    lineHeight: 14,
  },
  compactVenueType: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 1,
    fontStyle: 'italic',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  compactDate: {
    fontWeight: '600',
    marginRight: 8,
  },
  compactTime: {
    fontWeight: '500',
    marginRight: 8,
  },
  compactCategory: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  // Mockup-style card design
  mockupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mockupImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  mockupImage: {
    width: '100%',
    height: '100%',
  },
  mockupPriceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  mockupPriceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mockupCategoryTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mockupCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  mockupContent: {
    padding: 12,
  },
  mockupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  mockupDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  mockupVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  mockupVenueIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  mockupVenueText: {
    fontSize: 12,
    flex: 1,
  },
  mockupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  mockupDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockupDateIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  mockupDateText: {
    fontSize: 12,
  },
  mockupTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockupTimeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  mockupTimeText: {
    fontSize: 12,
  },
  mockupVenueTypeRow: {
    marginBottom: 8,
  },
  mockupVenueType: {
    fontSize: 12,
  },
  mockupVenueTextContainer: {
    flex: 1,
  },
  mockupVenueName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  mockupVenueAddress: {
    fontSize: 12,
    flexWrap: 'wrap',
  },
  mockupButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockupViewButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  mockupViewButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mockupShareButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 60,
  },
  mockupShareButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Tooltip styles
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    marginLeft: -35, // Center the tooltip (approximate width/2)
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 70,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    marginLeft: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default EventCard;
