import React, { useState } from 'react';
import {View, StyleSheet, ScrollView, Platform, TextInput, TouchableOpacity, Dimensions, Pressable} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  Button,
  Text,
  SearchableDropdown,
  DateRangePicker,
  VenueSelectionModal,
  CityPicker,
  CategoryPills,
  FilterRow,
  SearchAndToggle,
  ViewToggle
} from './ui';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';
import { screenshotMarker } from '../utils/screenshot';
import {useCityLocation} from "../hooks/useCityLocation";
import {useDeviceInfo} from "../hooks/useDeviceInfo";

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
  viewMode = 'list',
  onViewModeChange,
  resultsCount = 0
}: FilterBarProps) {
  const { theme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const {selectedCity} = useCityLocation();
  const {isMobile} = useDeviceInfo();

  // Screenshot marker for development
  React.useEffect(() => {
    screenshotMarker('FilterBar redesign loaded');
  }, []);

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
    // Dispatch actions to update the filter state in useEvents
    dispatchFilters({ type: 'SET_START_DATE', payload: range.start });
    dispatchFilters({ type: 'SET_END_DATE', payload: range.end });
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

      {/* Search Bar and View Toggle */}
      <SearchAndToggle
        searchText={filters.searchText}
        onSearchChange={handleSearchChange}
      />

      <View style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center' }}>
      {/* Category Pills */}
      <CategoryPills
        selectedCategory={filters.category}
        onCategoryChange={handleCategoryChange}
      />
        <Pressable onPress={() => setShowMore(!showMore)}>
          <Text variant='link'>{`${showMore ? 'Hide' : 'Show'} More Filters`}</Text>
        </Pressable>
      </View>
      {/* Additional Filtering */}
        {showMore && (<FilterRow
        selectedDateRange={{ start: filters.startDate, end: filters.endDate }}
        selectedPrice={filters.price}
        selectedSize={filters.size}
        onDateRangeChange={handleDateRangeChange}
        onPriceChange={handlePriceChange}
        onSizeChange={handleSizeChange}
        resultsCount={resultsCount}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />)}
      {/* Results count and view toggle row */}
      <View style={styles.bottomRow}>
        {resultsCount !== undefined && (
            <Text
                variant="body2"
                style={[styles.resultsText, { color: theme.colors.text.secondary }]}
            >
              {resultsCount} events found in {selectedCity}
            </Text>
        )}

        <View style={styles.spacer} />

        {onViewModeChange && (
            <ViewToggle
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    position: 'relative',
    zIndex: 100,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  resultsText: {
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
});