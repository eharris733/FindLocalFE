import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Event } from '../types/events';
import { Venue } from '../types/venues';
import { useTheme } from '../context/ThemeContext';
import CustomMapMarker from './CustomMapMarker';


// Import using require to bypass TypeScript issues with this library
const MapView = require('@teovilla/react-native-web-maps').default;

interface MapViewWebProps {
  events: Event[];
  venues: Venue[];
  venuesLoading: boolean;
  onEventPress: (event: Event) => void;
  onVenuePress?: (venue: Venue) => void;
  highlightedEventId?: string;
  selectedCity?: string;
  displayCity?: string;
}

const getCityCenter = (city?: string) => {
  console.log('🎯 getCityCenter called with city:', city);
  switch (city) {
    case 'boston':
      console.log('🎯 Returning Boston coordinates');
      return { latitude: 42.3601, longitude: -71.0589 }; // Boston
    case 'brooklyn':
      console.log('🎯 Returning Brooklyn coordinates');
      return { latitude: 40.6782, longitude: -73.9442 }; // Brooklyn
    default:
      console.log('🎯 Returning default Brooklyn coordinates for unknown city:', city);
      return { latitude: 40.6782, longitude: -73.9442 }; // Default to Brooklyn
  }
};

const fallbackCamera = {
  center: {
    latitude: 40.6782,
    longitude: -73.9442,
  },
  zoom: 10,
  heading: 0,
  pitch: 0,
}

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

const MapViewWeb: React.FC<MapViewWebProps> = ({ 
  events, 
  venues,
  venuesLoading,
  onEventPress,
  onVenuePress,
  highlightedEventId,
  selectedCity,
  displayCity
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<any>(null);
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const markerClickedRef = useRef<boolean>(false);
  const lastActionRef = useRef<{ type: 'marker' | 'map' | 'callout', timestamp: number } | null>(null);

  // Debug activeCalloutId changes
  useEffect(() => {
    console.log('🔄 activeCalloutId STATE CHANGED:', { 
      previous: 'see prev log', 
      current: activeCalloutId,
      timestamp: new Date().toISOString()
    });
  }, [activeCalloutId]);

  // Calculate initial camera based on selected city (not venues)
  const getInitialCamera = () => {
    console.log('🗺️ getInitialCamera called with selectedCity:', selectedCity);
    
    // Always use city center for initial camera to avoid flashing
    const cityCenter = getCityCenter(selectedCity);
    console.log('🗺️ Using city center for initial camera:', cityCenter, 'for city:', selectedCity);
    
    const camera = {
      center: cityCenter,
      zoom: 12,
      heading: 0,
      pitch: 0,
    };
    
    console.log('🗺️ Final camera object:', camera);
    return camera;
  };

  const initialCamera = getInitialCamera();
  console.log('🗺️ MapView initialCamera set to:', initialCamera);

  // Add effect to force camera update when component mounts
  useEffect(() => {
    if (mapRef.current) {
      console.log('🗺️ Map mounted, forcing camera to:', initialCamera.center);
      // Force immediate camera update after mount
      setTimeout(() => {
        mapRef.current?.animateCamera({
          center: initialCamera.center,
          zoom: initialCamera.zoom,
        }, { duration: 0 });
      }, 100);
    }
  }, []); // Run only on mount

  useEffect(() => {
    // Simple auto-fit to venues when venues are loaded
    if (!venuesLoading && venues.length > 0 && mapRef.current) {
      const coords = venues
        .map(v => ({ 
          latitude: Number(v.latitude), 
          longitude: Number(v.longitude) 
        }))
        .filter(c => !Number.isNaN(c.latitude) && !Number.isNaN(c.longitude) && c.latitude !== 0 && c.longitude !== 0);

      if (coords.length > 0) {
        console.log('🗺️ Fitting map to venue coordinates:', coords);
        // Simple timeout then fit to coordinates - no padding
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            animated: true,
          });
        }, 500);
      }
    } else {
      console.log('🗺️ Not fitting to venues. Venues count:', venues.length, 'Loading:', venuesLoading);
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
    console.log('📍 Callout toggle requested:', { 
      from: activeCalloutId, 
      to: venueId,
      isClosing: venueId === null,
      isSwitching: activeCalloutId !== null && venueId !== null && activeCalloutId !== venueId,
      timestamp: new Date().toISOString()
    });
    
    // Use functional update to ensure we have the latest state
    setActiveCalloutId(prevState => {
      console.log('📍 State update: prev =', prevState, ', new =', venueId);
      return venueId;
    });
  };

  const handleMapClick = (e: any) => {
    const now = Date.now();
    console.log('🗺️ Map clicked, markerClickedRef:', markerClickedRef.current);
    console.log('🗺️ Last action:', lastActionRef.current);
    
    // If a marker was just clicked (within 500ms), don't close the callout
    const IGNORE_MS = 800; // slightly longer on mobile web to avoid flakiness
    if (
      markerClickedRef.current ||
      (lastActionRef.current?.type === 'marker' && now - lastActionRef.current.timestamp < IGNORE_MS) ||
      (lastActionRef.current?.type === 'callout' && now - lastActionRef.current.timestamp < IGNORE_MS)
    ) {
      console.log('🗺️ Map click ignored - marker was recently clicked');
      return;
    }
    lastActionRef.current = { type: 'map', timestamp: now };
    
    // Close any active callout when clicking on the map
    setActiveCalloutId(prevState => {
      if (prevState) {
        console.log('🗺️ Closing callout from map click, was:', prevState);
        return null;
      } else {
        console.log('🗺️ Map click - no active callout to close');
        return prevState;
      }
    });
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        initialCamera={initialCamera}
        googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
        // Disable clicking on default Google POI/label icons, while showing text via customMapStyle
        options={{ clickableIcons: false }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
        zoomControlEnabled={true}
        customMapStyle={customMapStyle}
        onPress={handleMapClick}
      >
  {!venuesLoading && sortedVenueEntries.map(({ venue, venueEvents, isHighlighted, isActive }) => {
          // Debug logging for active state
          if (venue.id === activeCalloutId || isActive) {
            console.log('🏢 Venue render debug:', {
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
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
});

export default MapViewWeb;