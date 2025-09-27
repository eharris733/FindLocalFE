import React, { useRef, useState } from 'react';
import { View, StyleSheet, Image, Pressable, Platform, TouchableOpacity } from 'react-native';
import { Event } from '../types/events';
import { Venue } from '../types/venues';
import { Text } from './ui/Text';
import { set } from 'date-fns';
import { useTheme } from '../context/ThemeContext';

// Import using require to bypass TypeScript issues with this library
const { Marker, Callout } = require('@teovilla/react-native-web-maps');


interface CustomMapMarkerProps {
  venue: Venue;
  venueEvents: Event[];
  isHighlighted: boolean;
  isActive: boolean;
  markerClickedRef: React.RefObject<boolean>;
  lastActionRef: React.RefObject<{ type: 'marker' | 'map', timestamp: number } | null>;
  onCalloutToggle: (venueId: string | null) => void;
  onEventPress: (event: Event) => void;
  onVenuePress?: (venue: Venue) => void;
}

const isWeb = Platform.OS === 'web';

const CustomMapMarker: React.FC<CustomMapMarkerProps> = ({
  venue,
  venueEvents,
  isHighlighted,
  isActive,
  markerClickedRef,
  lastActionRef,
  onCalloutToggle,
  onEventPress,
  onVenuePress,
}) => {
  const { theme } = useTheme();
  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  // Limit to maximum 9 events to prevent user frustration
  const limitedEvents = venueEvents.slice(0, 9);
  const hasEvents = limitedEvents.length > 0;
  const eventCount = limitedEvents.length;

  const [isHovered, setHovered] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  // Get the image URL with fallback hierarchy: event image -> venue image -> record.png
  const getImageUrl = (event: Event) => {
    if (event?.image_url) {
      return event.image_url;
    }
    if (venue?.image) {
      return venue.image;
    }
    // Return the record.png as fallback
    return require('../../assets/record.png');
  };

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  const handleMarkerPress = (e: any) => {
    if (!hasEvents) return;
    
    const now = Date.now();
    console.log('🎯 Marker pressed, isActive:', isActive, 'venue:', venue.id, 'timestamp:', now);
    
    // Prevent map click from firing - set this immediately
    markerClickedRef.current = true;
    lastActionRef.current = { type: 'marker', timestamp: now };
    
    e?.stopPropagation?.();
    e?.preventDefault?.();

    // Toggle callout visibility immediately - no setTimeout needed
    if (isActive) {
      console.log('🎯 Closing callout for venue:', venue.id);
      onCalloutToggle(null);
    } else {
      console.log('🎯 Opening callout for venue:', venue.id);
      onCalloutToggle(venue.id);
    }

    // Reset the marker clicked flag after a reasonable delay
    setTimeout(() => {
      markerClickedRef.current = false;
    }, 200);
  };

  return (
    <Marker
      key={venue.id}
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      calloutAnchor={{ x: 0.5, y: 1 }}
      onPress={(e: any) => {
        handleMarkerPress(e);
        console.log('Marker pressed', venue.id);
      }}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    >
      <View  
      style={[
            styles.dotBase,
            hasEvents ? [styles.dotActive] : styles.dotInactive,
            (isHighlighted || isHovered) && [styles.dotHighlighted, { backgroundColor: theme.colors.primary[700] }],
          ]}
        >
        {hasEvents && eventCount > 0 && (
          <View style={[styles.eventCountBadge, { backgroundColor: theme.colors.secondary[500] }]}>
            <Text variant="caption" style={[styles.eventCountText, { color: theme.colors.text.primary }]}>
              {eventCount > 9 ? '9+' : eventCount}
            </Text>
          </View>
        )}
      </View>

      {isActive && (
        <Callout tooltip>
          <View style={[styles.calloutContainer, { backgroundColor: theme.colors.background.primary }]}>
            <View style={[styles.calloutBubble, { 
              backgroundColor: theme.colors.background.primary, 
              borderColor: theme.colors.border.light 
            }]}>
              {hasEvents && (
                <>
                  {/* Event Image with fallback */}
                  <Image
                    source={
                      typeof getImageUrl(limitedEvents[currentEventIndex]) === 'string' 
                        ? { uri: getImageUrl(limitedEvents[currentEventIndex]) }
                        : getImageUrl(limitedEvents[currentEventIndex])
                    }
                    style={styles.calloutImage}
                    resizeMode="cover"
                  />

                  {/* Close button */}
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: theme.colors.background.secondary }]}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      e?.preventDefault?.();
                      onCalloutToggle(null);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.closeButtonText, { color: theme.colors.text.primary }]}>×</Text>
                  </TouchableOpacity>
                  
                  {/* Navigation arrows for multiple events */}
                  {limitedEvents.length > 1 && (
                    <>
                      <TouchableOpacity
                        style={[styles.navArrow, styles.navArrowLeft, { backgroundColor: theme.colors.background.secondary }]}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          e?.preventDefault?.();
                          setCurrentEventIndex(prev => prev === 0 ? limitedEvents.length - 1 : prev - 1);
                        }}
                        hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.arrowText, { color: theme.colors.text.primary }]}>‹</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.navArrow, styles.navArrowRight, { backgroundColor: theme.colors.background.secondary }]}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          e?.preventDefault?.();
                          setCurrentEventIndex(prev => prev === limitedEvents.length - 1 ? 0 : prev + 1);
                        }}
                        hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.arrowText, { color: theme.colors.text.primary }]}>›</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Event Name */}
                  <Text variant="h6" style={[styles.eventName, { color: theme.colors.text.primary }]} numberOfLines={2}>
                    {limitedEvents[currentEventIndex]?.title}
                  </Text>

                  {/* Venue Name */}
                  <Text variant="body2" style={[styles.venueName, { color: theme.colors.text.secondary }]}>
                    {venue.name}
                  </Text>

                  {/* Spacer to push content to bottom */}
                  <View style={{ flex: 1 }} />

                  {/* Event indicator for multiple events */}
                  {limitedEvents.length > 1 && (
                    <Text variant="caption" style={[styles.eventIndicator, { color: theme.colors.text.tertiary }]}>
                      {currentEventIndex + 1} of {limitedEvents.length}{venueEvents.length > 9 ? ' (showing first 9)' : ''}
                    </Text>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary[500] }]}
                      onPress={() => onEventPress(limitedEvents[currentEventIndex])}
                    >
                      <Text variant="caption" style={[styles.buttonText, { color: theme.colors.text.inverse }]}>
                        See Event
                      </Text>
                    </TouchableOpacity>
                    {onVenuePress && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.venueButton, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.medium }]}
                        onPress={() => onVenuePress(venue)}
                      >
                        <Text variant="caption" style={[styles.buttonText, { color: theme.colors.text.primary }]}>
                          See Venue
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
            <View style={[styles.calloutArrow, { 
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.light 
            }]} />
          </View>
        </Callout>
      )}
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBase: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    ...(Platform.OS === 'web'
      ? {
          transitionProperty: 'background-color, transform',
          transitionDuration: '150ms',
          transitionTimingFunction: 'ease',
          cursor: 'pointer',
        }
      : null),
  },
  dotActive: {
    backgroundColor: '#EF4444',
  },
  dotInactive: {
    backgroundColor: '#9CA3AF',
    borderColor: '#FFFFFF',
  },
  dotHighlighted: {
    transform: [{ scale: 1.25 }],
  },
  eventCountBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eventCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // --- Callout/card styles ---
  calloutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    display: 'flex',
    position: 'relative',
  },
  calloutBubble: {
    width: 200,
    height: 280, // Increased height for better layout
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    display: 'flex',
    boxSizing: 'border-box' as any,
    marginLeft: -100,
    marginTop: -10,
    zIndex: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  calloutImage: {
    width: '100%',
    height: 100, // Restored to proper size
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0', // Add background color in case image fails to load
  },
  
  // Close button
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    opacity: 0.9,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  
  // Navigation arrows
  navArrow: {
    position: 'absolute',
    top: 50, // Moved down to avoid close button overlap
    width: 32, // Slightly larger for better mobile touch
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    opacity: 0.9,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  navArrowLeft: {
    left: 8,
  },
  navArrowRight: {
    right: 8,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },

  // Event and venue info
  eventName: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  venueName: {
    marginBottom: 8,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  eventIndicator: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4, // Small gap before buttons
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    marginTop: 'auto', // Push buttons to bottom
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  venueButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  calloutArrow: {
    alignSelf: 'center',
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});

export default CustomMapMarker;
