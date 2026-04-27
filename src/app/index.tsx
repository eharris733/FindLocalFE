import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import EventFeed from '../components/EventFeed';
import { useTheme } from '../context/ThemeContext';
import { StructuredData } from '../components/StructuredData';
import { useCityLocation } from '../context/CityContext';

export default function IndexRoute() {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const params = useLocalSearchParams<{ view?: string }>();
  const viewMode: 'list' | 'map' = params.view === 'map' ? 'map' : 'list';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StructuredData city={selectedCity} />
      <EventFeed viewMode={viewMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
