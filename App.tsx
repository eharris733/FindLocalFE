import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView,
  StatusBar 
} from 'react-native';
import { useEvents } from './src/hooks/useEvents';
import EventCard from './src/components/EventCard';
import FilterControls from './src/components/FilterControls';

export default function App() {
  const {
    loading,
    error,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
  } = useEvents();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B5E" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error loading events:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Find Local</Text>
      </View>

      <FilterControls
        filters={filters}
        dispatchFilters={dispatchFilters}
        availableCategories={availableCategories}
        availableLocations={availableLocations}
      />

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#006B5E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
});
