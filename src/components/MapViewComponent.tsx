import React, { useState, useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { getAllVenues, getVenuesByCity } from '../api/venues';
import { useTheme } from '../context/ThemeContext';
import { useCityLocation } from '../context/CityContext';
import { Text } from './ui';

interface MapViewComponentProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onVenuePress?: (venue: Venue) => void;
  highlightedEventId?: string;
}

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  events,
  onEventPress,
  onVenuePress,
  highlightedEventId,
}) => {
  const { theme } = useTheme();
  const { selectedCity, displayCity } = useCityLocation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  // Fetch venues with coordinates based on selected city
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        console.log('🗺️ MapViewComponent: Fetching venues for city:', selectedCity);
        setVenuesLoading(true);
        
        // Use selectedCity to fetch city-specific venues
        const venueData = selectedCity 
          ? await getVenuesByCity(selectedCity)
          : await getAllVenues();
          
        // Filter venues that have coordinates
        const venuesWithCoords = venueData.filter(venue => 
          venue.latitude && venue.longitude && venue.is_active
        );
        
        console.log(`🗺️ MapViewComponent: Found ${venuesWithCoords.length} venues with coordinates for ${selectedCity}`);
        setVenues(venuesWithCoords);
      } catch (error) {
        console.error('Failed to fetch venues for map:', error);
      } finally {
        setVenuesLoading(false);
      }
    };

    fetchVenues();
  }, [selectedCity]); // Re-fetch when selectedCity changes

  // For web platform, use the web map component
  if (Platform.OS === 'web') {
    const MapViewWeb = require('./MapView.web').default;
    return (
      <MapViewWeb 
        key={`map-${selectedCity}`} // Force complete re-render when city changes
        events={events} 
        venues={venues}
        venuesLoading={venuesLoading}
        onEventPress={onEventPress}
        onVenuePress={onVenuePress}
        highlightedEventId={highlightedEventId}
        selectedCity={selectedCity}
        displayCity={displayCity}
      />
    );
  }

  // For mobile platforms, show a placeholder for now
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <View style={styles.placeholder}>
        <Text variant="h3" style={[styles.placeholderTitle, { 
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }]}>
          📱 Mobile Map
        </Text>
        <Text variant="body1" style={[styles.placeholderText, {
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.sm,
        }]}>
          Map view for mobile platforms will be implemented with react-native-maps
        </Text>
        <Text variant="body2" style={[styles.placeholderSubtext, {
          color: theme.colors.text.tertiary,
        }]}>
          {events.length} events • {venues.length} venues with coordinates in {displayCity}
        </Text>
        {highlightedEventId && (
          <Text variant="caption" style={[styles.highlightText, {
            color: theme.colors.primary[600],
            marginTop: theme.spacing.sm,
          }]}>
            Event {highlightedEventId} highlighted
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderTitle: {
    textAlign: 'center',
  },
  placeholderText: {
    textAlign: 'center',
  },
  placeholderSubtext: {
    textAlign: 'center',
  },
  highlightText: {
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default MapViewComponent;
