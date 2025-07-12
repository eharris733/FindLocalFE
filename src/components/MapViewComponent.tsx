import React, { useState } from 'react';
import { Platform } from 'react-native';
import type { Event } from '../types/events';

// Platform-specific imports
let MapView: any;
let Marker: any;

if (Platform.OS !== 'web') {
  // Only import react-native-maps on mobile platforms
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} else {
  // Use web placeholder component
  MapView = require('./MapView.web.tsx').default;
}

import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, shadows } from '../theme';

interface MapViewComponentProps {
  events: Event[];
  onMarkerPress: (event: Event) => void;
}

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  events,
  onMarkerPress,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Default Brooklyn coordinates
  const initialRegion = {
    latitude: 40.6782,
    longitude: -73.9442,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const handleMarkerPress = (event: Event) => {
    setSelectedEventId(event.id);
    onMarkerPress(event);
  };

  // Mock coordinates for events (you'll replace this with real data)
  const getEventCoordinates = (event: Event, index: number) => {
    const baseLatitude = 40.6782;
    const baseLongitude = -73.9442;
    
    // Distribute events around Brooklyn
    const offsetLat = (Math.random() - 0.5) * 0.1;
    const offsetLng = (Math.random() - 0.5) * 0.1;
    
    return {
      latitude: baseLatitude + offsetLat,
      longitude: baseLongitude + offsetLng,
    };
  };

  if (Platform.OS === 'web') {
    // Return web version
    return <MapView events={events} onMarkerPress={onMarkerPress} />;
  }

  // Return mobile version with react-native-maps
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={true}
        toolbarEnabled={false}
      >
        {events.map((event, index) => {
          const coordinates = getEventCoordinates(event, index);
          const isSelected = selectedEventId === event.id;
          
          return (
            <Marker
              key={event.id}
              coordinate={coordinates}
              onPress={() => handleMarkerPress(event)}
            >
              <View style={[
                styles.marker,
                isSelected && styles.markerSelected
              ]}>
                <Text style={styles.markerText}>🎵</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
};

// Custom map styling
const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#63BAAB' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  marker: {
    backgroundColor: colors.primary[500],
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
    ...shadows.medium,
  },
  markerSelected: {
    backgroundColor: colors.background.primary,
    transform: [{ scale: 1.2 }],
  },
  markerText: {
    fontSize: 18,
  },
});

export default MapViewComponent;
