import React, { useState } from 'react';
import { Platform, View, Text, StyleSheet, Dimensions } from 'react-native';
import type { Event } from '../types/events';
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

  const handleMarkerPress = (event: Event) => {
    setSelectedEventId(event.id);
    onMarkerPress(event);
  };

  // For web platform, use the web map component
  if (Platform.OS === 'web') {
    const MapViewWeb = require('./MapView.web').default;
    return <MapViewWeb events={events} onMarkerPress={handleMarkerPress} />;
  }

  // For mobile platforms, show a placeholder for now
  // (You can implement react-native-maps later)
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>📱 Mobile Map</Text>
        <Text style={styles.placeholderText}>
          Map view for mobile platforms will be implemented with react-native-maps
        </Text>
        <Text style={styles.placeholderSubtext}>
          {events.length} events ready to display
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderTitle: {
    ...typography.heading2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  placeholderText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  placeholderSubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default MapViewComponent;
