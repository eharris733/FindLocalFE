import React, { useState, useCallback } from 'react';
import {View, StyleSheet, Pressable} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  Text,
  CategoryPills,
  FilterRow,
  SearchAndToggle,
  ViewToggle
} from './ui';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';
import { screenshotMarker } from '../utils/screenshot';
import {useCityLocation} from "../context/CityContext";
import {useDeviceInfo} from "../hooks/useDeviceInfo";

interface FilterBarProps {
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
  venues: Venue[];
  venuesLoading: boolean;
  viewMode?: 'gallery' | 'list' | 'map';
  onViewModeChange?: (mode: 'gallery' | 'list' | 'map') => void;
  resultsCount?: number;
  loading?: boolean;
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
  resultsCount = 0,
  loading = false
}: FilterBarProps) {
  const { theme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const {isMobile} = useDeviceInfo();
  const { selectedCity } = useCityLocation();

  // Screenshot marker for development
  React.useEffect(() => {
    screenshotMarker('FilterBar redesign loaded');
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    dispatchFilters({ type: 'SET_CATEGORY', payload: category });
  }, [dispatchFilters]);

  const handleDateRangeChange = useCallback((dateRange: string) => {
    // Map the pill selection to the appropriate filter action
    const rangeMap: Record<string, FilterState['dateRange']> = {
      'all': 'all',
      'today': 'today',
      'tomorrow': 'tomorrow',
      'this_week': 'this_week',
    };
    
    const mappedRange = rangeMap[dateRange];
    if (mappedRange) {
      dispatchFilters({ type: 'SET_DATE_RANGE', payload: mappedRange });
    }
  }, [dispatchFilters]);

  const handleSearchChange = useCallback((text: string) => {
    dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text });
  }, [dispatchFilters]);

  const handleViewModeChange = useCallback((mode: 'gallery' | 'list' | 'map') => {
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  const handleDateRangePickerChange = useCallback((range: DateRange) => {
    // Dispatch actions to update the filter state in useEvents
    dispatchFilters({ type: 'SET_START_DATE', payload: range.start });
    dispatchFilters({ type: 'SET_END_DATE', payload: range.end });
  }, [dispatchFilters]);

  const handlePriceChange = useCallback((price: string) => {
    dispatchFilters({ type: 'SET_PRICE', payload: price });
  }, [dispatchFilters]);

  const handleSizeChange = useCallback((size: string | string[]) => {
    dispatchFilters({ type: 'SET_SIZE', payload: size });
  }, [dispatchFilters]);

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

      <View style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 8 : 0
      }}>
        {/* Category Pills - Full width on mobile for better scrolling */}
        <View style={{ flex: isMobile ? undefined : 1 }}>
          <CategoryPills
            selectedCategory={filters.category}
            onCategoryChange={handleCategoryChange}
            selectedDateRange={filters.dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </View>
        
        {/* Show More Filters Button */}
        <View style={{ 
          alignItems: isMobile ? 'center' : 'flex-end',
          paddingHorizontal: isMobile ? 16 : 0,
          marginLeft: isMobile ? 0 : 16
        }}>
          <Pressable onPress={() => setShowMore(!showMore)}>
            <Text variant='link'>{`${showMore ? 'Hide' : 'Show'} More Filters`}</Text>
          </Pressable>
        </View>
      </View>
      {/* Additional Filtering */}
        {showMore && (<FilterRow
        selectedDateRange={{ start: filters.startDate, end: filters.endDate }}
        selectedPrice={filters.price}
        selectedSize={filters.size}
        onDateRangeChange={handleDateRangePickerChange}
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