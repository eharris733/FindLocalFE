import React, { useState } from 'react';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useEvents } from './src/hooks/useEvents';
import MainLayout from './src/components/MainLayout';
import VenueModal from './src/components/VenueModal';
import { Text } from './src/components/ui';
import type { Event } from './src/types/events';

function AppContent() {
  const { theme, isDark } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  
  const {
    loading,
    error,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
  } = useEvents();

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowVenueModal(true);
  };

  const handleCloseVenueModal = () => {
    setShowVenueModal(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.colors.background.primary} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body1" color="secondary" style={styles.loadingText}>
            Loading events...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.colors.background.primary} 
        />
        <View style={styles.errorContainer}>
          <Text variant="h3" color="error" style={styles.errorTitle}>
            Error loading events:
          </Text>
          <Text variant="body1" color="secondary" style={styles.errorText}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background.primary} 
      />
      
      <MainLayout
        events={filteredEvents}
        filters={filters}
        dispatchFilters={dispatchFilters}
        availableCategories={availableCategories}
        availableLocations={availableLocations}
        onEventPress={handleEventPress}
      />

      {/* Venue Modal */}
      <VenueModal
        visible={showVenueModal}
        event={selectedEvent}
        onClose={handleCloseVenueModal}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
});
