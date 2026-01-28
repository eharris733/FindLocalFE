import React, { useMemo } from 'react';
import { View, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { Text } from './ui';
import { getDisplayCityName } from '../utils/cityUtils';
import { getCompactVenueSizeLabel } from '../utils/venueUtils';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { getGenresFromEventTypes, getGenreDisplayLabel } from '../constants/eventCategories';
import { analytics } from '../utils/analytics';
import type { Community } from '../api/communities';
import { openLink } from '../utils/linkUtils';

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
  variant?: 'default' | 'compact' | 'grouped';
  venues?: Venue[]; // Optional venue list for faster lookup
  onVenuePress?: (venue: Venue) => void; // Optional callback for venue press
  isMobile?: boolean; // Optional mobile flag for grouped variant
  communities?: Community[]; // Available communities for enrichment
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

const EventCard: React.FC<EventCardProps> = ({ event, onPress, variant = 'default', venues, isMobile: isMobileProp, communities = [] }) => {
  const { theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isMobile: isDeviceMobile } = useDeviceInfo();
  
  // Use prop if provided, otherwise use device info
  const isMobile = isMobileProp !== undefined ? isMobileProp : isDeviceMobile;
  
  const isEventFavorited = isFavorite(event.id);
  
  // Get enriched communities for this event
  const enrichedCommunities = useMemo(() => {
    if (!event.event_community_assignments || !communities.length) return [];
    
    return event.event_community_assignments
      .map(assignment => {
        const community = communities.find(c => c.id === assignment.community_id);
        if (!community) return null;
        
        return {
          id: assignment.community_id,
          color: community.metadata?.color || '#6366f1',
          icon: community.metadata?.icon || '🎵',
        };
      })
      .filter(Boolean)
      .slice(0, 3); // Max 3 dots
  }, [event.event_community_assignments, communities]);
  
  const handleToggleFavorite = async (e: any) => {
    // Stop propagation to prevent opening the event modal
    e.stopPropagation();
    
    const metricType = isEventFavorited ? 'unfavorite' : 'favorite';
    
    // Track favorite action
    analytics.trackEventMetric({
      eventId: event.id,
      metricType,
      city: event.city,
      source: variant === 'compact' ? 'list' : variant === 'grouped' ? 'list' : 'gallery',
      metadata: {
        variant,
      },
    });
    
    await toggleFavorite(event.id);
  };
  
  // Optimized venue lookup using useMemo instead of useEffect/useState
  const venue = useMemo(() => {
    if (!event.venue_id || !venues) return null;
    return venues.find(v => v.id === event.venue_id) || null;
  }, [event.venue_id, venues]);

  // Memoize venue info to avoid recalculation on every render
  const venueInfo = useMemo(() => {
    return {
      name: venue?.name || null,
      address: venue?.address || getDisplayCityName(event.city),
      size: venue?.venue_size || null,
      sizeLabel: venue?.venue_size ? getCompactVenueSizeLabel(venue.venue_size) : null,
      type: venue?.type || null,
      image: venue?.image || null
    };
  }, [venue, event.city]);
  
  // Memoize display genre
  const displayGenre = useMemo(() => {
    const genres = getGenresFromEventTypes(event.event_type);
    if (genres.length > 0) {
      return getGenreDisplayLabel(genres[0]);
    }
    return null;
  }, [event.event_type]);
  
  const handleCardPress = () => {
    // Track event click
    analytics.trackEventMetric({
      eventId: event.id,
      metricType: 'click',
      city: event.city,
      source: variant === 'compact' ? 'list' : variant === 'grouped' ? 'list' : 'gallery',
      metadata: {
        variant,
        eventType: event.event_type,
        hasImage: !!event.image_url,
      },
    });
    
    if (onPress) {
      onPress(event);
    } else if (event.detail_page_url) {
      openLink(event.detail_page_url);
    }
  };

  // Priority: event image -> venue image -> default music icon
  const imageSource = event.image_url 
    ? { uri: event.image_url }
    : venue?.image
    ? { uri: venue.image }
    : require('../../assets/record.png');

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
            defaultSource={require('../../assets/record.png')}
            fadeDuration={100}
          />
          
          <View style={styles.compactContent}>
            {/* Favorite heart icon */}
            <TouchableOpacity 
              onPress={handleToggleFavorite}
              style={styles.compactFavoriteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.compactFavoriteIcon, { 
                color: isEventFavorited ? theme.colors.error : theme.colors.gray[400] 
              }]}>
                {isEventFavorited ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
            <Text variant="body1" numberOfLines={2} style={styles.compactTitle}>
              {event.title || 'Untitled Event'}
            </Text>
            
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
            
            {/* Community indicators */}
            {enrichedCommunities.length > 0 && (
              <View style={[styles.communityIndicators, {
                flexDirection: 'row',
                gap: 3,
                marginTop: theme.spacing.xs,
                marginBottom: theme.spacing.xs,
              }]}>
                {enrichedCommunities.map((community: any, index: number) => (
                  <View
                    key={`${community.id}-${index}`}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: community.color,
                    }}
                  />
                ))}
              </View>
            )}
            
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

  // Grouped variant - minimal info for venue-grouped list view
  if (variant === 'grouped') {
    return (
      <TouchableOpacity onPress={handleCardPress}>
        <View style={[styles.groupedCard, { 
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
        }]}>
          {/* Date and time on the left */}
          <View style={styles.groupedDateSection}>
            {event.event_date && (
              <Text variant="caption" style={[
                styles.groupedDate, 
                isMobile && styles.groupedDateMobile,
                { color: theme.colors.text.primary }
              ]}>
                {format(new Date(event.event_date), 'MMM dd')}
              </Text>
            )}
            {event.start_time && (
              <Text variant="caption" style={[
                styles.groupedTime, 
                isMobile && styles.groupedTimeMobile,
                { color: theme.colors.text.secondary }
              ]}>
                {formatMilitaryTime(event.start_time)}
              </Text>
            )}
          </View>
          
          {/* Event details */}
          <View style={styles.groupedContent}>
            <View style={styles.groupedTitleRow}>
              <Text variant="body2" numberOfLines={1} style={[
                styles.groupedTitle,
                isMobile && styles.groupedTitleMobile,
                { color: theme.colors.text.primary }
              ]}>
                {event.title || 'Untitled Event'}
              </Text>
              
              {/* Community indicator dots - show on mobile */}
              {isMobile && enrichedCommunities.length > 0 && (
                <View style={[styles.communityIndicators, {
                  flexDirection: 'row',
                  gap: 2,
                  marginLeft: theme.spacing.xs,
                }]}>
                  {enrichedCommunities.map((community: any, index: number) => (
                    <View
                      key={`${community.id}-${index}`}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: community.color,
                      }}
                    />
                  ))}
                </View>
              )}
              
              {/* Metadata tags - hide on mobile */}
              {!isMobile && (
                <View style={styles.groupedMetaTags}>
                  {displayGenre && (
                    <View style={[styles.groupedTag, { 
                      backgroundColor: theme.colors.primary[100],
                      borderColor: theme.colors.primary[200],
                    }]}>
                      <Text variant="caption" style={[styles.groupedTagText, { color: theme.colors.primary[700] }]} numberOfLines={1}>
                        {displayGenre}
                      </Text>
                    </View>
                  )}
                  {event.status && (
                    <View style={[styles.groupedTag, { 
                      backgroundColor: theme.colors.success[100],
                      borderColor: theme.colors.success[200],
                    }]}>
                      <Text variant="caption" style={[styles.groupedTagText, { color: theme.colors.success[700] }]} numberOfLines={1}>
                        {event.status}
                      </Text>
                    </View>
                  )}
                  {event.price && (
                    <View style={[styles.groupedTag, { 
                      backgroundColor: theme.colors.accent[100],
                      borderColor: theme.colors.accent[200],
                    }]}>
                      <Text variant="caption" style={[styles.groupedTagText, { color: theme.colors.accent[700] }]} numberOfLines={1}>
                        {event.price}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              <TouchableOpacity 
                onPress={handleToggleFavorite}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[
                  styles.groupedFavoriteIcon, 
                  isMobile && styles.groupedFavoriteIconMobile,
                  { color: isEventFavorited ? theme.colors.error : theme.colors.gray[400] }
                ]}>
                  {isEventFavorited ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action buttons - hide on mobile */}
          {!isMobile && (
            <View style={styles.groupedActions}>
              {/* View Details button */}
              <TouchableOpacity 
                style={[
                  styles.groupedButton,
                  { backgroundColor: theme.colors.primary[500] }
                ]}
                onPress={handleCardPress}
              >
                <Text variant="caption" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
                  Details
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
            defaultSource={require('../../assets/record.png')}
            fadeDuration={100}
            // Force load immediately for better LCP
            loadingIndicatorSource={require('../../assets/record.png')}
          />
          {/* Favorite heart icon in top-left */}
          <TouchableOpacity 
            onPress={handleToggleFavorite}
            style={[styles.favoriteButton, { backgroundColor: theme.colors.background.primary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.favoriteIcon, { 
              color: isEventFavorited ? theme.colors.error : theme.colors.gray[400] 
            }]}>
              {isEventFavorited ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          
          {/* Price pin in top-right corner */}
          {event.price && (
            <View style={[styles.mockupPriceTag, { backgroundColor: theme.colors.background.primary }]}>
              <Text style={[styles.mockupPriceText, { color: theme.colors.text.primary }]}>
                {event.price}
              </Text>
            </View>
          )}
          
          {/* Status pin below price (if both exist) or in top-right */}
          {event.status && (
            <View style={[
              styles.mockupStatusPin, 
              { 
                backgroundColor: event.status.toLowerCase().includes('sold') 
                  ? theme.colors.error 
                  : event.status.toLowerCase().includes('cancel') || event.status.toLowerCase().includes('postpon')
                  ? theme.colors.warning
                  : theme.colors.success,
                top: event.price ? 48 : 8, // Position below price if price exists
              }
            ]}>
              <Text style={[styles.mockupStatusText, { color: theme.colors.text.inverse }]}>
                {event.status}
              </Text>
            </View>
          )}
          
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
          
          <View style={styles.mockupVenueRow}>
            <Text style={[styles.mockupVenueIcon, { color: theme.colors.text.secondary }]}>📍</Text>
            <View style={styles.mockupVenueTextContainer}>
              {venueInfo.name && (
                <Text style={[styles.mockupVenueName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {venueInfo.name}
                </Text>
              )}
              <Text style={[styles.mockupVenueAddress, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                {venueInfo.address}
              </Text>
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
            <Text style={[styles.mockupVenueType, { color: theme.colors.text.secondary }]}>
              🏢 {venueInfo.sizeLabel || 'Unknown size'} • {venueInfo.type || 'Venue'}
            </Text>
            
            {/* Community indicators */}
            {enrichedCommunities.length > 0 && (
              <View style={[styles.communityIndicators, {
                flexDirection: 'row',
                gap: 3,
                marginLeft: theme.spacing.sm,
              }]}>
                {enrichedCommunities.map((community: any, index: number) => (
                  <View
                    key={`${community.id}-${index}`}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: community.color,
                    }}
                  />
                ))}
              </View>
            )}
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
    backgroundColor: '#f0f0f0', // Placeholder to prevent CLS
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
    backgroundColor: '#f0f0f0', // Placeholder color to prevent CLS
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
  mockupStatusPin: {
    position: 'absolute',
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    opacity: 1,
  },
  mockupStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  
  // Favorite button styles
  favoriteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  favoriteIcon: {
    fontSize: 18,
  },
  compactFavoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  compactFavoriteIcon: {
    fontSize: 16,
  },
  
  // Grouped variant styles
  groupedCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  groupedDateSection: {
    minWidth: 64,
    alignItems: 'center',
  },
  groupedDate: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  groupedDateMobile: {
    fontSize: 12,
  },
  groupedTime: {
    fontSize: 12,
  },
  groupedTimeMobile: {
    fontSize: 10,
  },
  groupedContent: {
    flex: 1,
    minWidth: 0,
  },
  groupedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  groupedTitle: {
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 16,
  },
  groupedTitleMobile: {
    fontSize: 13,
    lineHeight: 15,
  },
  groupedFavoriteIcon: {
    fontSize: 16,
    lineHeight: 16,
  },
  groupedFavoriteIconMobile: {
    fontSize: 14,
    lineHeight: 14,
  },
  groupedMetaTags: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginLeft: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  groupedTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  groupedTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  groupedShareButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupedButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  groupedButtonMobile: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 80,
  },
});

export default React.memo(EventCard);
