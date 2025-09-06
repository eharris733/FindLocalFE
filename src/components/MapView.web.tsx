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
}

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
  // Hide all points of interest
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  
  // Hide transit elements
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
  
  // Hide all label icons and text
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }] },
  
  // Clean up roads - keep geometry but remove labels
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Hide administrative labels (city names, etc.)
  { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'on' }] },
];

const MapViewWeb: React.FC<MapViewWebProps> = ({ 
  events, 
  venues,
  venuesLoading,
  onEventPress,
  onVenuePress,
  highlightedEventId 
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<any>(null);
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const markerClickedRef = useRef<boolean>(false);
  const lastActionRef = useRef<{ type: 'marker' | 'map', timestamp: number } | null>(null);

  // Debug activeCalloutId changes
  useEffect(() => {
    console.log('🔄 activeCalloutId STATE CHANGED:', { 
      previous: 'see prev log', 
      current: activeCalloutId,
      timestamp: new Date().toISOString()
    });
  }, [activeCalloutId]);

  // Calculate initial camera based on venue coordinates
  const getInitialCamera = () => {
    if (venues.length === 0) {
      // Default to Brooklyn if no venues
      return fallbackCamera;
    }

    // Calculate bounds from venue coordinates
    const latitudes = venues.map(v => Number(v.latitude)).filter(lat => !isNaN(lat));
    const longitudes = venues.map(v => Number(v.longitude)).filter(lng => !isNaN(lng));

    if (latitudes.length === 0 || longitudes.length === 0) {
      // Fallback to Brooklyn
      return fallbackCamera;
    }

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    return {
      center: {
        latitude: centerLat,
        longitude: centerLng,
      },
      zoom: 10,
      heading: 0,
      pitch: 0,
    };
  };

  useEffect(() => {
    if (!venuesLoading && venues.length > 0 && mapRef.current) {
      const coords = venues
        .map(v => ({ 
          latitude: Number(v.latitude), 
          longitude: Number(v.longitude) 
        }))
        .filter(c => !Number.isNaN(c.latitude) && !Number.isNaN(c.longitude));

      if (coords.length > 0) {
        // Use a small timeout to ensure map is fully loaded
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, // Tight padding
            animated: false,
          });
        }, 100);
      }
    }
  }, [venuesLoading, venues]);

  // Close active callout when highlighted event changes
  useEffect(() => {
    setActiveCalloutId(null);
  }, [highlightedEventId]);

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

  const initialCamera = getInitialCamera();

  const handleMapClick = (e: any) => {
    const now = Date.now();
    console.log('🗺️ Map clicked, markerClickedRef:', markerClickedRef.current);
    console.log('🗺️ Last action:', lastActionRef.current);
    
    // If a marker was just clicked (within 500ms), don't close the callout
    if (markerClickedRef.current || 
        (lastActionRef.current?.type === 'marker' && now - lastActionRef.current.timestamp < 500)) {
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        initialCamera={initialCamera}
        googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
        zoomControlEnabled={true}
        customMapStyle={customMapStyle}
        onPress={handleMapClick}
      >
        {!venuesLoading && venues.map((venue) => {
          const venueEvents = getEventsForVenue(venue);
          const isHighlighted = venueEvents.some(event => event.id === highlightedEventId);
          const isActive = activeCalloutId === venue.id;
          
          // Debug logging for active state
          if (venue.id === activeCalloutId || isActive) {
            console.log('🏢 Venue render debug:', {
              venueId: venue.id,
              activeCalloutId,
              isActive,
              venueEvents: venueEvents.length
            });
          }
          
          // Only render markers for venues that have events
          if (venueEvents.length === 0) {
            return null;
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