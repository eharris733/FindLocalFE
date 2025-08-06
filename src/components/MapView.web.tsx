import React, { useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { Event } from '../types/events';
import { Venue } from '../types/venues';
import { Text } from './ui/Text';
import { useTheme } from '../context/ThemeContext';

// Import using require to bypass TypeScript issues with this library
const MapView = require('@teovilla/react-native-web-maps').default;
const { Marker } = require('@teovilla/react-native-web-maps');

interface MapViewWebProps {
  events: Event[];
  venues: Venue[];
  venuesLoading: boolean;
  onMarkerPress: (event: Event) => void;
  highlightedEventId?: string;
}

const MapViewWeb: React.FC<MapViewWebProps> = ({ 
  events, 
  venues,
  venuesLoading,
  onMarkerPress, 
  highlightedEventId 
}) => {
  const { theme } = useTheme();

  // Calculate initial region based on venue coordinates
  const getInitialRegion = () => {
    if (venues.length === 0) {
      // Default to Brooklyn if no venues
      return {
        latitude: 40.6782,
        longitude: -73.9442,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    // Calculate bounds from venue coordinates
    const latitudes = venues.map(v => Number(v.latitude)).filter(lat => !isNaN(lat));
    const longitudes = venues.map(v => Number(v.longitude)).filter(lng => !isNaN(lng));

    if (latitudes.length === 0 || longitudes.length === 0) {
      // Fallback to Brooklyn
      return {
        latitude: 40.6782,
        longitude: -73.9442,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max((maxLat - minLat) * 1.2, 0.01); // Add padding
    const deltaLng = Math.max((maxLng - minLng) * 1.2, 0.01); // Add padding

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    };
  };

  // Get events for a specific venue
  const getEventsForVenue = (venue: Venue): Event[] => {
    return events.filter(event => 
      event.venue_name?.toLowerCase() === venue.name?.toLowerCase() ||
      event.venue_id === venue.id
    );
  };

  const initialRegion = getInitialRegion();

  // Debug logging
  console.log('MapView.web.tsx - Debug info:', {
    venuesCount: venues.length,
    venuesLoading,
    eventsCount: events.length,
    venuesWithCoords: venues.filter(v => v.latitude && v.longitude).length,
    sampleVenue: venues[0]
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <MapView
        style={styles.map}
        provider="google"
        initialRegion={initialRegion}
        googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
        mapType="roadmap"
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
        zoomControlEnabled={true}
      >
        {!venuesLoading && venues.map((venue) => {
          const latitude = Number(venue.latitude);
          const longitude = Number(venue.longitude);
          
          // Skip venues with invalid coordinates
          if (isNaN(latitude) || isNaN(longitude)) {
            return null;
          }

          const venueEvents = getEventsForVenue(venue);
          const hasEvents = venueEvents.length > 0;
          const isHighlighted = venueEvents.some(event => event.id === highlightedEventId);
          
          return (
            <Marker
              key={venue.id}
              coordinate={{
                latitude,
                longitude,
              }}
              title={venue.name}
              description={`${venue.city} • ${venueEvents.length} event${venueEvents.length !== 1 ? 's' : ''} • ${venue.type || 'Venue'}`}
              pinColor={isHighlighted ? '#FF6B6B' : hasEvents ? '#4ECDC4' : '#CCCCCC'}
              onPress={() => {
                console.log('Venue marker pressed:', venue.name);
                // If venue has events, trigger onMarkerPress with the first event
                if (venueEvents.length > 0) {
                  onMarkerPress(venueEvents[0]);
                }
              }}
            />
          );
        })}
      </MapView>
      
      {/* Debug overlay */}
      <View style={[styles.debugOverlay, { 
        backgroundColor: theme.colors.background.primary + 'CC',
        borderColor: theme.colors.border.light,
      }]}>
        <Text variant="caption" color="secondary" style={styles.debugText}>
          📍 {venues.length} venues • {events.length} events {highlightedEventId ? `• Highlighting: ${highlightedEventId}` : ''} • API: {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? 'OK' : 'Missing'}
        </Text>
      </View>
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
  },
  debugText: {
    textAlign: 'center',
  },
});

export default MapViewWeb;