import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import MapViewComponent from './MapViewComponent';
import type { Event } from '../types/events';

interface MapPanelProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  highlightedEventId?: string;
  onMarkerPress?: (event: Event) => void;
}

export default function MapPanel({ 
  events, 
  onEventPress, 
  highlightedEventId,
  onMarkerPress 
}: MapPanelProps) {
  const { theme } = useTheme();

  const handleMarkerPress = (event: Event) => {
    // Directly call onEventPress to open the EventModal
    onEventPress(event);
    onMarkerPress?.(event);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <MapViewComponent 
        events={events}
        onEventPress={handleMarkerPress}
        highlightedEventId={highlightedEventId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});