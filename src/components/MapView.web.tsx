import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from '@teovilla/react-native-web-maps';
import type { Event } from '../types/events';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';

interface MapViewWebProps {
  events: Event[];
  onMarkerPress: (event: Event) => void;
  highlightedEventId?: string;
}

const MapViewWeb: React.FC<MapViewWebProps> = ({ 
  events, 
  onMarkerPress, 
  highlightedEventId 
}) => {
  const { theme } = useTheme();

  // Brooklyn coordinates
  const initialRegion = {
    latitude: 40.6782,
    longitude: -73.9442,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // Mock coordinates for events - making them more spread out in Brooklyn
  const getEventCoordinates = (event: Event, index: number) => {
    const baseLatitude = 40.6782;
    const baseLongitude = -73.9442;
    
    // Create a more predictable distribution
    const row = Math.floor(index / 5);
    const col = index % 5;
    
    const offsetLat = (row - 2) * 0.02; // Spread vertically
    const offsetLng = (col - 2) * 0.03; // Spread horizontally
    
    return {
      latitude: baseLatitude + offsetLat,
      longitude: baseLongitude + offsetLng,
    };
  };

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
        {events.slice(0, 20).map((event, index) => {
          const coordinates = getEventCoordinates(event, index);
          const isHighlighted = highlightedEventId === event.id;
          
          return (
            <Marker
              key={event.id}
              coordinate={coordinates}
              title={event.title}
              description={`${event.venue_name} - ${new Date(event.event_date).toLocaleDateString()}`}
              pinColor={isHighlighted ? '#FF6B6B' : '#4ECDC4'}
              onPress={() => {
                console.log('Marker pressed:', event.title);
                onMarkerPress(event);
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
          📍 {events.length} events {highlightedEventId ? `• Highlighting: ${highlightedEventId}` : ''} • API: {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? 'OK' : 'Missing'}
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