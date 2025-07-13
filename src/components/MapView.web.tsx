import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from '@teovilla/react-native-web-maps';
import type { Event } from '../types/events';
import { colors, typography, spacing } from '../theme';

interface MapViewWebProps {
  events: Event[];
  onMarkerPress: (event: Event) => void;
}

const MapViewWeb: React.FC<MapViewWebProps> = ({ events, onMarkerPress }) => {
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

  console.log('MapView.web.tsx: Rendering with', events.length, 'events');
  console.log('MapView.web.tsx: API Key available:', !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

  return (
    <View style={styles.container}>
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
        {events.slice(0, 20).map((event, index) => { // Limit to 20 markers for better performance
          const coordinates = getEventCoordinates(event, index);
          
          return (
            <Marker
              key={event.id}
              coordinate={coordinates}
              title={event.title}
              description={`${event.venue_name} - ${new Date(event.event_date).toLocaleDateString()}`}
              onPress={() => {
                console.log('Marker pressed:', event.title);
                onMarkerPress(event);
              }}
            />
          );
        })}
      </MapView>
      
      {/* Debug overlay */}
      <View style={styles.debugOverlay}>
        <Text style={styles.debugText}>
          📍 {events.length} events • API: {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? 'OK' : 'Missing'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  map: {
    flex: 1,
    width: '100%',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.sm,
    borderRadius: 8,
  },
  debugText: {
    ...typography.caption,
    color: 'white',
    textAlign: 'center',
  },
});

export default MapViewWeb;