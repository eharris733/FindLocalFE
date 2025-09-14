import React, { useState } from 'react';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFonts } from 'expo-font';
import {
  WorkSans_300Light,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { CityProvider } from './src/context/CityContext';
import { useEvents } from './src/hooks/useEvents';
import { useCityLocation } from './src/context/CityContext';
import MainLayout from './src/components/MainLayout';
import VenueModal from './src/components/VenueModal';
import { Text } from './src/components/ui';
import type { Event } from './src/types/events';

function AppContent() {
  const { theme, isDark } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [fontTimeout, setFontTimeout] = useState(false);
  
  // Get city location data
  const { selectedCity, onCityChange } = useCityLocation();
  
  // Debug: Log when selectedCity changes in App component
  React.useEffect(() => {
    console.log('🚀 App component: selectedCity changed to:', selectedCity);
  }, [selectedCity]);
  
  // Load Work Sans fonts with error handling
  const [fontsLoaded, fontError] = useFonts({
    WorkSans_300Light,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  // Set a timeout to prevent infinite loading on font failure
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded && !fontError) {
        console.warn('Font loading timeout - proceeding with fallback fonts');
        setFontTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);
  
  // Debug: Log what we're about to pass to useEvents
  console.log('🚀 App component: About to call useEvents with selectedCity:', selectedCity);
  
  const {
    loading,
    error,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
    venues,
    venuesLoading,
  } = useEvents({ selectedCity });

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowVenueModal(true);
  };

  const handleCloseVenueModal = () => {
    setShowVenueModal(false);
    setSelectedEvent(null);
  };

  // Show loading while fonts are loading (but not forever)
  if (!fontsLoaded && !fontError && !fontTimeout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.colors.background.primary} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body1" color="secondary" style={styles.loadingText}>
            Loading fonts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        venues={venues}
        venuesLoading={venuesLoading}
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
      <CityProvider>
        <AppContent />
      </CityProvider>
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
