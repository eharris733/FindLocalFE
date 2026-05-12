import React, { useRef, useEffect, useState } from 'react';
import { Platform, View, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { Event } from '../types/events';
import { Venue } from '../types/venues';
import { useTheme } from '../context/ThemeContext';
import CustomMapMarker from './CustomMapMarker';
import { logger } from '../utils/logger';
import { Text } from './ui/Text';
const MapView = require('./MapView').default;


interface MapViewWebProps {
  events: Event[];
  venues: Venue[];
  venuesLoading: boolean;
  onEventPress: (event: Event) => void;
  onVenuePress?: (venue: Venue) => void;
  highlightedEventId?: string;
  selectedCity?: string;
}

const getCityCenter = (city?: string) => {
  //console.log('🎯 getCityCenter called with city:', city);
  switch (city?.toLowerCase()) {
    case 'boston':
      //console.log('🎯 Returning Boston coordinates');
      return { latitude: 42.3601, longitude: -71.0589 }; // Boston
    case 'new york':
      //console.log('🎯 Returning New York coordinates');
      return { latitude: 40.6782, longitude: -73.9442 }; // New York
    default:
      //console.log('🎯 Returning default New York coordinates for unknown city:', city);
      return { latitude: 40.6782, longitude: -73.9442 }; // Default to New York
  }
};

const customMapStyle = [
  // Keep text labels visible but hide label icons globally
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // Keep POI text but hide POI icons specifically
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },

  // Optionally hide transit features (kept from previous config)
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },

  // Ensure road and administrative labels remain visible
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'on' }] },
];

const EventMap: React.FC<MapViewWebProps> = ({ 
  events, 
  venues,
  venuesLoading,
  onEventPress,
  onVenuePress,
  highlightedEventId,
  selectedCity
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<any>(null);
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const markerClickedRef = useRef<boolean>(false);
  const lastActionRef = useRef<{ type: 'marker' | 'map' | 'callout', timestamp: number } | null>(null);
  const hasUserInteractedRef = useRef<boolean>(false);

  // Mobile bottom sheet state
  const [selectedVenue, setSelectedVenue] = useState<{ venue: Venue; events: Event[] } | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  // Debug activeCalloutId changes
  useEffect(() => {
    // console.log('🔄 activeCalloutId STATE CHANGED:', { 
    //   previous: 'see prev log', 
    //   current: activeCalloutId,
    //   timestamp: new Date().toISOString()
    // });
  }, [activeCalloutId]);

  // Calculate initial region based on selected city (not venues)
  const getInitialRegion = () => {
    const cityCenter = getCityCenter(selectedCity);
    // Web needs tighter zoom (smaller delta = more zoomed in)
    const delta = Platform.OS === 'web' ? 0.05 : 0.15;
    return {
      ...cityCenter,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
  };

  const initialRegion = getInitialRegion();

  // Web only: fit to venues when they load
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!venuesLoading && venues.length > 0 && mapRef.current && !hasUserInteractedRef.current) {
      const coords = venues
        .map(v => ({
          latitude: Number(v.latitude),
          longitude: Number(v.longitude)
        }))
        .filter(c => !Number.isNaN(c.latitude) && !Number.isNaN(c.longitude) && c.latitude !== 0 && c.longitude !== 0);

      if (coords.length > 0) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            animated: true,
            edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          });
        }, 500);
      }
    }
  }, [venuesLoading, venues]);

  // Close active callout when highlighted event changes
  useEffect(() => {
    setActiveCalloutId(null);
  }, [highlightedEventId]);

  // No forced remount; rely on render order and zIndex

  // Get events for a specific venue
  const getEventsForVenue = (venue: Venue): Event[] => {
    return events.filter(event => 
      event.venue_id?.toLowerCase() === venue.id?.toLowerCase() ||
      event.venue_id === venue.id
    );
  };

  // Handle callout toggle with logging
  const handleCalloutToggle = (venueId: string | null) => {
    // Mark that user has interacted to prevent auto-fit from interfering
    if (venueId !== null) {
      hasUserInteractedRef.current = true;
    }

    // console.log('📍 Callout toggle requested:', {
    //   from: activeCalloutId,
    //   to: venueId,
    //   isClosing: venueId === null,
    //   isSwitching: activeCalloutId !== null && venueId !== null && activeCalloutId !== venueId,
    //   timestamp: new Date().toISOString()
    // });

    // Use functional update to ensure we have the latest state
    setActiveCalloutId(prevState => {
      // console.log('📍 State update: prev =', prevState, ', new =', venueId);
      return venueId;
    });

    // Close bottom sheet on mobile when callout is closed
    if (Platform.OS !== 'web' && venueId === null) {
      setSelectedVenue(null);
      setCurrentEventIndex(0);
    }
  };

  // Handle marker selection for mobile bottom sheet
  const handleMarkerSelect = (venue: Venue, events: Event[]) => {
    setSelectedVenue({ venue, events });
    setCurrentEventIndex(0);
  };

  const handleMapClick = (e: any) => {
    const now = Date.now();
    // console.log('🗺️ Map clicked, markerClickedRef:', markerClickedRef.current);
    // console.log('🗺️ Last action:', lastActionRef.current);

    // If a marker was just clicked (within 500ms), don't close the callout
    const IGNORE_MS = 800; // slightly longer on mobile web to avoid flakiness
    if (
      markerClickedRef.current ||
      (lastActionRef.current?.type === 'marker' && now - lastActionRef.current.timestamp < IGNORE_MS) ||
      (lastActionRef.current?.type === 'callout' && now - lastActionRef.current.timestamp < IGNORE_MS)
    ) {
      // console.log('🗺️ Map click ignored - marker was recently clicked');
      return;
    }
    lastActionRef.current = { type: 'map', timestamp: now };
    
    // Close any active callout when clicking on the map
    setActiveCalloutId(prevState => {
      if (prevState) {
        // console.log('🗺️ Closing callout from map click, was:', prevState);
        return null;
      } else {
        // console.log('🗺️ Map click - no active callout to close');
        return prevState;
      }
    });
  };

  // Function to center map on a specific coordinate
  const centerMapOnMarker = (latitude: number, longitude: number) => {
    hasUserInteractedRef.current = true; // Mark user interaction
    if (mapRef.current) {
      // console.log('🎯 Centering map on marker:', { latitude, longitude });
      mapRef.current.animateCamera({
        center: { latitude, longitude },
        zoom: Platform.OS === 'web' ? 15 : 14, // Slightly less zoom on mobile
      }, { duration: Platform.OS === 'web' ? 500 : 300 }); // Faster animation on mobile
    }
  };

  // Debug logging
  // console.log('MapView.web.tsx - Debug info:', {
  //   venuesCount: venues.length,
  //   venuesLoading,
  //   eventsCount: events.length,
  //   venuesWithCoords: venues.filter(v => v.latitude && v.longitude).length,
  //   sampleVenue: venues[0]
  // });

  // Prepare venue entries and ensure the active marker renders last (on top)
  const venueEntries = (!venuesLoading ? venues.map((venue) => {
    const venueEvents = getEventsForVenue(venue);
    const isHighlighted = venueEvents.some(event => event.id === highlightedEventId);
    const isActive = activeCalloutId === venue.id;
    return { venue, venueEvents, isHighlighted, isActive };
  }).filter(entry => entry.venueEvents.length > 0) : []);

  const sortedVenueEntries = venueEntries.sort((a, b) => {
    // Non-active first, active last
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? 1 : -1;
  });

  // Get the active venue entry for overlay
  // No overlay; we rely on in-map callouts

  const webOnlyProps =
    Platform.OS === 'web'
      ? {
          provider: 'google' as const,
          googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
          options: {
            clickableIcons: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false,
          },
          zoomControlEnabled: false,
        }
      : {};

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
        customMapStyle={customMapStyle}
        onPress={handleMapClick}
        onPanDrag={() => { hasUserInteractedRef.current = true; }}
        onRegionChangeComplete={() => { hasUserInteractedRef.current = true; }}
        {...webOnlyProps}
      >
  {!venuesLoading && sortedVenueEntries.map(({ venue, venueEvents, isHighlighted, isActive }) => {
          // Debug logging for active state
          if (venue.id === activeCalloutId || isActive) {
            logger.debug('🏢 Venue render debug:', {
              venueId: venue.id,
              activeCalloutId,
              isActive,
              venueEvents: venueEvents.length
            });
          }

          return (
            <CustomMapMarker
              key={venue.id}
              venue={venue}
              venueEvents={venueEvents}
              isHighlighted={isHighlighted}
              isActive={isActive}
              markerClickedRef={markerClickedRef}
              lastActionRef={lastActionRef}
              onCalloutToggle={handleCalloutToggle}
              onEventPress={onEventPress}
              onVenuePress={onVenuePress}
              onMarkerPress={centerMapOnMarker}
              onMarkerSelect={handleMarkerSelect}
            />
          );
        })}
      </MapView>
      
      {/* Debug overlay - uncomment if necessary */}
      {/* <View style={[styles.debugOverlay, {
        backgroundColor: theme.colors.background.primary + 'CC',
        borderColor: theme.colors.border.light,
      }]}>
        <Text variant="caption" color="secondary" style={styles.debugText}>
          📍 {venues.length} venues • {events.length} events {highlightedEventId ? `• Highlighting: ${highlightedEventId}` : ''} • API: {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? 'OK' : 'Missing'}
        </Text>
      </View> */}

      {/* Mobile Bottom Sheet */}
      {Platform.OS !== 'web' && selectedVenue && (
        <View style={[styles.bottomSheet, { backgroundColor: theme.colors.background.primary, borderColor: theme.colors.border.light }]}>
          {/* Event Image */}
          {(() => {
            const sheetImageUri =
              selectedVenue.events[currentEventIndex]?.image_url ||
              selectedVenue.venue?.image ||
              null;
            return sheetImageUri ? (
              <Image
                source={{ uri: sheetImageUri }}
                style={styles.bottomSheetImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.bottomSheetImage, { backgroundColor: theme.colors.surface.sunken, alignItems: 'center', justifyContent: 'center' }]}>
                <Text variant="caption" color="tertiary">📅</Text>
              </View>
            );
          })()}

          {/* Close button */}
          <TouchableOpacity
            style={[styles.bottomSheetClose, { backgroundColor: theme.colors.background.secondary }]}
            onPress={() => {
              setSelectedVenue(null);
              handleCalloutToggle(null);
            }}
          >
            <Text style={[styles.bottomSheetCloseText, { color: theme.colors.text.primary }]}>×</Text>
          </TouchableOpacity>

          {/* Navigation arrows for multiple events */}
          {selectedVenue.events.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.bottomSheetNavArrow, styles.bottomSheetNavArrowLeft, { backgroundColor: theme.colors.background.secondary }]}
                onPress={() => setCurrentEventIndex(prev => prev === 0 ? selectedVenue.events.length - 1 : prev - 1)}
              >
                <Text style={[styles.bottomSheetArrowText, { color: theme.colors.text.primary }]}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomSheetNavArrow, styles.bottomSheetNavArrowRight, { backgroundColor: theme.colors.background.secondary }]}
                onPress={() => setCurrentEventIndex(prev => prev === selectedVenue.events.length - 1 ? 0 : prev + 1)}
              >
                <Text style={[styles.bottomSheetArrowText, { color: theme.colors.text.primary }]}>›</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Content */}
          <View style={styles.bottomSheetContent}>
            <Text variant="h6" style={[styles.bottomSheetTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>
              {selectedVenue.events[currentEventIndex]?.title}
            </Text>
            <Text variant="body2" style={[styles.bottomSheetVenue, { color: theme.colors.text.secondary }]}>
              {selectedVenue.venue.name}
            </Text>

            {selectedVenue.events.length > 1 && (
              <Text variant="caption" style={[styles.bottomSheetIndicator, { color: theme.colors.text.tertiary }]}>
                {currentEventIndex + 1} of {selectedVenue.events.length}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={styles.bottomSheetButtons}>
              <TouchableOpacity
                style={[styles.bottomSheetButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={() => {
                  onEventPress(selectedVenue.events[currentEventIndex]);
                }}
              >
                <Text variant="caption" style={[styles.bottomSheetButtonText, { color: theme.colors.text.inverse }]}>
                  See Event
                </Text>
              </TouchableOpacity>
              {onVenuePress && (
                <TouchableOpacity
                  style={[styles.bottomSheetButton, styles.bottomSheetVenueButton, {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.medium
                  }]}
                  onPress={() => {
                    onVenuePress(selectedVenue.venue);
                  }}
                >
                  <Text variant="caption" style={[styles.bottomSheetButtonText, { color: theme.colors.text.primary }]}>
                    See Venue
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && { height: '100%', width: '100%' }),
  },
  map: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && { height: '100%' }),
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: '50%',
  },
  debugText: {
    textAlign: 'center',
  },
  // Bottom sheet styles
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.2)' } as any,
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
    }),
  },
  bottomSheetImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  bottomSheetClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bottomSheetCloseText: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  bottomSheetNavArrow: {
    position: 'absolute',
    top: 60,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bottomSheetNavArrowLeft: {
    left: 12,
  },
  bottomSheetNavArrowRight: {
    right: 12,
  },
  bottomSheetArrowText: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  bottomSheetContent: {
    padding: 16,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bottomSheetVenue: {
    fontSize: 14,
    marginBottom: 8,
  },
  bottomSheetIndicator: {
    fontSize: 12,
    marginBottom: 12,
  },
  bottomSheetButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomSheetButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomSheetVenueButton: {
    borderWidth: 1,
  },
  bottomSheetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EventMap;
