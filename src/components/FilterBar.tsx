import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  Text,
  SearchAndToggle,
  ViewToggle,
  WhenDropdown,
  WhatDropdown,
  WhereDropdown,
  PriceDropdown,
  TimeDropdown,
} from './ui';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import { screenshotMarker } from '../utils/screenshot';

type ViewMode = 'gallery' | 'list' | 'map';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface FilterBarProps {
  readonly filters: FilterState;
  readonly dispatchFilters: React.Dispatch<FilterAction>;
  readonly availableFilterOptions?: {
    venueTypes: string[];
    sizes: string[];
    regions: string[];
    priceRanges: string[];
    timeRanges: string[];
    eventTypes: string[];
  };
  readonly viewMode?: ViewMode;
  readonly onViewModeChange?: (mode: ViewMode) => void;
  readonly resultsCount?: number;
  readonly loading?: boolean;
}

import { useCityLocation } from "../context/CityContext";
import { getEventTypesForCategory } from '../constants/eventCategories';
import { ALL_VENUES } from '../constants';

export default function FilterBar({ 
  filters, 
  dispatchFilters,
  availableFilterOptions,
  viewMode = 'list',
  onViewModeChange,
  resultsCount = 0,
  loading = false
}: FilterBarProps) {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();

  // Screenshot marker for development
  React.useEffect(() => {
    screenshotMarker('FilterBar redesign loaded');
  }, []);

  // Handle category change - maps UI categories to event_type filters only
  const handleCategoryChange = useCallback((categories: string[]) => {
    dispatchFilters({ type: 'SET_CATEGORY', payload: categories });
    
    // Map categories to event types only (don't auto-filter venue types)
    const eventTypes = new Set<string>();
    
    for (const categoryId of categories) {
      if (categoryId === 'all' || categoryId === 'favorites') {
        continue; // Don't add types for 'all' or 'favorites'
      }
      
      const catEventTypes = getEventTypesForCategory(categoryId);
      
      for (const et of catEventTypes) {
        eventTypes.add(et);
      }
    }
    
    dispatchFilters({ type: 'SET_EVENT_TYPES', payload: Array.from(eventTypes) });
    // Don't automatically set venue types - let user control that separately via Where filter
  }, [dispatchFilters]);

  const handleDateRangeChange = useCallback((option: 'today' | 'tomorrow' | 'this_week' | 'custom') => {
    dispatchFilters({ type: 'SET_DATE_RANGE', payload: option });
  }, [dispatchFilters]);

  const handleSearchChange = useCallback((text: string) => {
    dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text });
  }, [dispatchFilters]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  const handleCustomDateRangeChange = useCallback((range: DateRange) => {
    dispatchFilters({ type: 'SET_START_DATE', payload: range.start });
    dispatchFilters({ type: 'SET_END_DATE', payload: range.end });
  }, [dispatchFilters]);

  const handlePriceChange = useCallback((price?: { min?: number; max?: number }) => {
    dispatchFilters({ type: 'SET_PRICE', payload: price });
  }, [dispatchFilters]);

  const handleTimeChange = useCallback((timeRange?: { start?: number; end?: number }) => {
    dispatchFilters({ type: 'SET_TIME_RANGE', payload: timeRange });
  }, [dispatchFilters]);

  const handleSizeChange = useCallback((sizes: string | string[]) => {
    dispatchFilters({ type: 'SET_SIZE', payload: sizes });
  }, [dispatchFilters]);

  const handleRegionsChange = useCallback((regions: string[]) => {
    dispatchFilters({ type: 'SET_REGIONS', payload: regions });
  }, [dispatchFilters]);

  const handleVenueTypesChange = useCallback((venueTypes: string[]) => {
    dispatchFilters({ type: 'SET_VENUE_TYPES', payload: venueTypes });
  }, [dispatchFilters]);

  const handleClearAllFilters = useCallback(() => {
    dispatchFilters({ type: 'CLEAR_ALL' });
  }, [dispatchFilters]);

  // Check if any non-default filters are applied
  const hasActiveFilters = useCallback(() => {
    // Check if search text is entered
    if (filters.searchText && filters.searchText.length > 0) return true;
    
    // Check if date range is not 'today' (default)
    if (filters.dateRange !== 'today') return true;
    
    // Check if category is not 'all' (default)
    if (filters.category !== 'all' && filters.category !== '') return true;
    
    // Check if event types are selected
    if (filters.eventTypes && filters.eventTypes.length > 0) return true;
    
    // Check if venue types are selected
    if (filters.venueTypes && filters.venueTypes.length > 0) return true;
    
    // Check if regions are selected
    if (filters.regions && filters.regions.length > 0) return true;
    
    // Check if size filter is not default ('All venues')
    const sizeArray = Array.isArray(filters.size) ? filters.size : [filters.size];
    if (!sizeArray.includes(ALL_VENUES) && sizeArray.length > 0) return true;
    
    // Check if price filter is set
    if (filters.price && (filters.price.min !== undefined || filters.price.max !== undefined)) return true;
    
    // Check if time range filter is set
    if (filters.timeRange && (filters.timeRange.start !== undefined || filters.timeRange.end !== undefined)) return true;
    
    return false;
  }, [filters]);

  // Normalize category to array for WhatDropdown
  const selectedCategories = Array.isArray(filters.category) ? filters.category : [filters.category];
  
  // Normalize size to array for WhereDropdown
  const selectedSizes = Array.isArray(filters.size) ? filters.size : [];

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.primary,
      borderBottomColor: theme.colors.border.light,
    }]}>

      {/* Search Bar */}
      <SearchAndToggle
        searchText={filters.searchText}
        onSearchChange={handleSearchChange}
      />

      {/* When, What, Where Filter Row */}
      <View style={styles.mainFilters}>
        {/* When Filter */}
        <WhenDropdown
          selectedOption={filters.dateRange === 'custom' ? 'custom' : filters.dateRange as any}
          customDateRange={{ start: filters.startDate, end: filters.endDate }}
          onOptionChange={handleDateRangeChange}
          onCustomDateChange={handleCustomDateRangeChange}
        />
        
        {/* What Filter */}
        <WhatDropdown
          selectedCategories={selectedCategories}
          onCategoriesChange={handleCategoryChange}
          multiSelect={true}
        />

        {/* Where Filter */}
        <WhereDropdown
          selectedVenueTypes={filters.venueTypes}
          selectedRegions={filters.regions}
          selectedSizes={selectedSizes}
          availableRegions={availableFilterOptions?.regions || []}
          availableVenueTypes={availableFilterOptions?.venueTypes}
          availableSizes={availableFilterOptions?.sizes}
          onVenueTypesChange={handleVenueTypesChange}
          onRegionsChange={handleRegionsChange}
          onSizesChange={handleSizeChange}
        />

        {/* Price Filter */}
        <PriceDropdown
          selectedPrice={filters.price}
          availablePriceRanges={availableFilterOptions?.priceRanges}
          onPriceChange={handlePriceChange}
        />

        {/* Time Filter */}
        <TimeDropdown
          selectedTime={filters.timeRange}
          availableTimeRanges={availableFilterOptions?.timeRanges}
          onTimeChange={handleTimeChange}
        />

        {/* Clear All Filters Button - Only show if filters are active */}
        {hasActiveFilters() && (
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.light,
              }
            ]}
            onPress={handleClearAllFilters}
          >
            <Text variant="caption" color="secondary" style={styles.clearButtonText}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Results count and view toggle row */}
      <View style={styles.bottomRow}>
        {resultsCount !== undefined && (
          <Text
            variant="body2"
            style={[styles.resultsText, { color: theme.colors.text.secondary }]}
          >
            {loading ? `Loading events in ${selectedCity}...` : `${resultsCount} events found in ${selectedCity}`}
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
  mainFilters: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
    flexWrap: 'wrap', // Allow wrapping on small screens
  },
  moreFiltersRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  additionalFilters: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  resultsText: {
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
