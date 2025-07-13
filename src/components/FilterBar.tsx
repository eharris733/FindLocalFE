import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button, Text } from './ui';
import type { FilterState, FilterAction } from '../hooks/useEvents';

interface FilterBarProps {
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

export default function FilterBar({ 
  filters, 
  dispatchFilters, 
  availableCategories, 
  availableLocations 
}: FilterBarProps) {
  const { theme } = useTheme();
  const [showAllFilters, setShowAllFilters] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(
    value => value !== '' && value !== 'all' && value !== null
  ).length;

  const clearAllFilters = () => {
    dispatchFilters({ type: 'CLEAR_ALL' });
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.primary,
      borderBottomColor: theme.colors.border.light,
    }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search/Location Filter */}
        <View style={styles.filterGroup}>
          <Text variant="caption" color="secondary" style={styles.filterLabel}>
            Location
          </Text>
          <View style={styles.filterButtons}>
            <Button
              variant={filters.location === 'all' ? 'primary' : 'secondary'}
              size="small"
              onPress={() => dispatchFilters({ type: 'SET_LOCATION', payload: 'all' })}
            >
              All Locations
            </Button>
            {availableLocations.slice(0, 3).map((location) => (
              <Button
                key={location}
                variant={filters.location === location ? 'primary' : 'secondary'}
                size="small"
                onPress={() => dispatchFilters({ type: 'SET_LOCATION', payload: location })}
                style={styles.filterButton}
              >
                {location}
              </Button>
            ))}
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterGroup}>
          <Text variant="caption" color="secondary" style={styles.filterLabel}>
            Category
          </Text>
          <View style={styles.filterButtons}>
            <Button
              variant={filters.category === 'all' ? 'primary' : 'secondary'}
              size="small"
              onPress={() => dispatchFilters({ type: 'SET_CATEGORY', payload: 'all' })}
            >
              All Categories
            </Button>
            {availableCategories.slice(0, 4).map((category) => (
              <Button
                key={category}
                variant={filters.category === category ? 'primary' : 'secondary'}
                size="small"
                onPress={() => dispatchFilters({ type: 'SET_CATEGORY', payload: category })}
                style={styles.filterButton}
              >
                {category}
              </Button>
            ))}
          </View>
        </View>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <View style={styles.filterGroup}>
            <Button
              variant="outline"
              size="small"
              onPress={clearAllFilters}
              style={styles.clearButton}
            >
              Clear All ({activeFiltersCount})
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  filterGroup: {
    marginRight: 24,
    alignItems: 'flex-start',
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
  },
  filterButton: {
    marginRight: 8,
    marginBottom: 4,
  },
  clearButton: {
    marginTop: 16,
  },
});