import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform
} from 'react-native';
import { useEvents } from '../hooks/useEvents';
import EventBottomSheet from './EventBottomSheet';
import MapViewComponent from './MapViewComponent';
import type { Event } from '../types/events';
import { colors, typography, spacing, shadows } from '../theme';

const MapPage: React.FC = () => {
  const { filteredEvents, loading, error } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleMarkerPress = (event: Event) => {
    console.log('MapPage: Marker pressed for event:', event.title);
    setSelectedEvent(event);
  };

  const handleCloseBottomSheet = () => {
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading events: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Events Map</Text>
        <Text style={styles.subtitle}>
          {filteredEvents.length} events • {Platform.OS === 'web' ? 'Web View' : 'Mobile View'}
        </Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          events={filteredEvents}
          onMarkerPress={handleMarkerPress}
        />
      </View>

      {/* Event Bottom Sheet */}
      {selectedEvent && (
        <EventBottomSheet
          event={selectedEvent}
          onClose={handleCloseBottomSheet}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.small,
  },
  title: {
    ...typography.heading2,
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});

export default MapPage;
