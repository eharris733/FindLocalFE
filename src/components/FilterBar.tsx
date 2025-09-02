import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button, Text, SearchableDropdown, DateRangePicker, VenueSelectionModal, CityPicker, CategoryPills, FilterRow, SearchAndToggle } from './ui';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';
import { screenshotMarker } from '../utils/screenshot';

interface FilterBarProps {
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
  venues: Venue[];
  venuesLoading: boolean;
  viewMode?: 'list' | 'map';
  onViewModeChange?: (mode: 'list' | 'map') => void;
  resultsCount?: number;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

export default function FilterBar({ 
  filters, 
  dispatchFilters, 
  availableCategories, 
  availableLocations,
  venues,
  venuesLoading,
  viewMode = 'list',
  onViewModeChange,
  resultsCount = 0
}: FilterBarProps) {
  const { theme } = useTheme();
  const [selectedCity, setSelectedCity] = useState('New York, NY');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({ start: null, end: null });

  // Screenshot marker for development
  React.useEffect(() => {
    screenshotMarker('FilterBar redesign loaded');
  }, []);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    // TODO: Integrate with actual location filtering
    console.log('City changed to:', city);
  };

  const handleCategoryChange = (category: string) => {
    dispatchFilters({ type: 'SET_CATEGORY', payload: category });
  };

  const handleSearchChange = (text: string) => {
    dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text });
  };

  const handleViewModeChange = (mode: 'list' | 'map') => {
    onViewModeChange?.(mode);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
    // TODO: Integrate with actual date filtering
    console.log('Date range changed to:', range);
  };

  const handlePriceChange = (price: string) => {
    dispatchFilters({ type: 'SET_PRICE', payload: price });
  };

  const handleSizeChange = (size: string) => {
    dispatchFilters({ type: 'SET_SIZE', payload: size });
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.primary,
      borderBottomColor: theme.colors.border.light,
    }]}>
      {/* City Picker */}
      <CityPicker
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
      />

      {/* Search Bar and View Toggle */}
      <SearchAndToggle
        searchText={filters.searchText}
        onSearchChange={handleSearchChange}
      />

      {/* Category Pills */}
      <CategoryPills
        selectedCategory={filters.category}
        onCategoryChange={handleCategoryChange}
      />

      {/* Filter Row with Results Count */}
      <FilterRow
        selectedDateRange={selectedDateRange}
        selectedPrice={filters.price}
        selectedSize={filters.size}
        onDateRangeChange={handleDateRangeChange}
        onPriceChange={handlePriceChange}
        onSizeChange={handleSizeChange}
        resultsCount={resultsCount}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    position: 'relative',
    zIndex: 100,
  },
});