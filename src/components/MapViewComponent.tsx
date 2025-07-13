import React, { useState } from 'react';
import { Platform, View, StyleSheet, Dimensions } from 'react-native';
import type { Event } from '../types/events';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';

interface MapViewComponentProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  highlightedEventId?: string;
}

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  events,
  onEventPress,
  highlightedEventId,
}) => {
  const { theme } = useTheme();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const handleMarkerPress = (event: Event) => {
    setSelectedEventId(event.id);
    onEventPress(event);
  };

  // For web platform, use the web map component
  if (Platform.OS === 'web') {
    const MapViewWeb = require('./MapView.web').default;
    return (
      <MapViewWeb 
        events={events} 
        onMarkerPress={handleMarkerPress}
        highlightedEventId={highlightedEventId}
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
          {events.length} events ready to display
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
