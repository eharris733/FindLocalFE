import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button, Text, SearchableDropdown, DateRangePicker, VenueSelectionModal } from './ui';
import type { FilterState, FilterAction } from '../hooks/useEvents';
import type { Venue } from '../types/venues';

interface FilterBarProps {
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
  venues: Venue[];
  venuesLoading: boolean;
}

export default function FilterBar({ 
  filters, 
  dispatchFilters, 
  availableCategories, 
  availableLocations,
  venues,
  venuesLoading
}: FilterBarProps) {
  const { theme } = useTheme();
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const quickDateOptions = [
    { value: 'today', label: 'Today', emoji: '🔥' },
    { value: 'tomorrow', label: 'Tomorrow', emoji: '⏰' },
    { value: 'this_week', label: 'Week', emoji: '📆' },
  ];

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'venues') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== '' && value !== 'ALL' && value !== null;
  }).length;

  const clearAllFilters = () => {
    dispatchFilters({ type: 'CLEAR_ALL' });
  };

  // Convert date range filter to DateRangePicker format
  const getDateRangeValue = () => {
    if (filters.startDate && filters.endDate) {
      return { start: filters.startDate, end: filters.endDate };
    }
    return { start: null, end: null };
  };

  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    if (range.start && range.end) {
      dispatchFilters({ type: 'SET_DATE_RANGE', payload: 'custom' });
      dispatchFilters({ type: 'SET_START_DATE', payload: range.start });
      dispatchFilters({ type: 'SET_END_DATE', payload: range.end });
    } else {
      dispatchFilters({ type: 'SET_DATE_RANGE', payload: 'all' });
      dispatchFilters({ type: 'SET_START_DATE', payload: null });
      dispatchFilters({ type: 'SET_END_DATE', payload: null });
    }
  };

  const handleVenueSelectionChange = (venueIds: string[]) => {
    dispatchFilters({ type: 'SET_VENUES', payload: venueIds });
  };

  // Get venue names for display
  const getSelectedVenueNames = () => {
    if (filters.venues.length === 0) return 'All Venues';
    if (filters.venues.length === 1) {
      const venue = venues.find(v => v.id === filters.venues[0]);
      return venue ? venue.name : 'Unknown Venue';
    }
    return `${filters.venues.length} venues selected`;
  };

  if (isMobile) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme.colors.background.primary,
        borderBottomColor: theme.colors.border.light,
      }]}>
        {/* Mobile Search Row */}
        <View style={[styles.mobileSearchRow, { 
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }]}>
          <TextInput
            style={[styles.searchInput, {
              flex: 1,
              borderColor: theme.colors.border.light,
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              marginRight: theme.spacing.sm,
            }]}
            placeholder="Search events..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={filters.searchText}
            onChangeText={(text) => 
              dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text })
            }
          />
          
          <TouchableOpacity
            style={[styles.filterToggle, {
              backgroundColor: showAllFilters 
                ? theme.colors.primary[500] 
                : theme.colors.background.secondary,
              borderColor: theme.colors.border.light,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
            }]}
            onPress={() => setShowAllFilters(!showAllFilters)}
          >
            <Text 
              variant="body2" 
              color={showAllFilters ? 'inverse' : 'secondary'}
              style={{ fontWeight: '600' }}
            >
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mobile Filter Sections - Collapsible */}
        {showAllFilters && (
          <View style={[styles.mobileFiltersContainer, {
            backgroundColor: theme.colors.background.secondary,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }]}>
            {/* Venue Selection */}
            <View style={[styles.mobileFilterSection, { marginBottom: theme.spacing.md }]}>
              <Text variant="caption" color="secondary" style={styles.mobileFilterLabel}>
                VENUES
              </Text>
              <TouchableOpacity
                style={[styles.venueSelector, {
                  borderColor: theme.colors.border.light,
                  backgroundColor: theme.colors.background.secondary,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                }]}
                onPress={() => setShowVenueModal(true)}
                disabled={venuesLoading}
              >
                <Text 
                  variant="body2" 
                  color={venuesLoading ? 'tertiary' : 'primary'}
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {venuesLoading ? 'Loading venues...' : 'Select venues'}
                </Text>
                {filters.venues.length > 0 && (
                  <Text variant="body2" color="secondary">
                    ({filters.venues.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Date Range Picker */}
            <View style={[styles.mobileFilterSection, { marginBottom: theme.spacing.md }]}>
              <DateRangePicker
                label="Date Range"
                value={getDateRangeValue()}
                onChange={handleDateRangeChange}
              />
            </View>

            {/* Categories */}
            <View style={[styles.mobileFilterSection, { marginBottom: theme.spacing.md }]}>
              <Text variant="caption" color="secondary" style={styles.mobileFilterLabel}>
                CATEGORIES
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mobileFilterScroll}
              >
                {availableCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.mobileFilterChip,
                      {
                        backgroundColor: filters.category === category 
                          ? theme.colors.primary[500] 
                          : theme.colors.background.primary,
                        borderColor: filters.category === category 
                          ? theme.colors.primary[600] 
                          : theme.colors.border.light,
                        paddingHorizontal: theme.spacing.sm,
                        paddingVertical: theme.spacing.xs,
                        borderRadius: theme.borderRadius.md,
                        marginRight: theme.spacing.xs,
                      }
                    ]}
                    onPress={() => 
                      dispatchFilters({ type: 'SET_CATEGORY', payload: category })
                    }
                  >
                    <Text 
                      variant="caption" 
                      color={filters.category === category ? 'inverse' : 'secondary'}
                      style={{ fontWeight: '500' }}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Clear Button */}
            {activeFiltersCount > 0 && (
              <TouchableOpacity
                style={[styles.clearButton, {
                  backgroundColor: theme.colors.background.primary,
                  borderColor: theme.colors.border.medium,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                  alignSelf: 'center',
                }]}
                onPress={clearAllFilters}
              >
                <Text variant="body2" color="secondary" style={{ fontWeight: '600' }}>
                  Clear All Filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // Desktop Layout
  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.primary,
      borderBottomColor: theme.colors.border.light,
    }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
        }]}
      >
        {/* Search */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg }]}>
          <Text variant="caption" color="secondary" style={styles.filterLabel}>
            SEARCH
          </Text>
          <TextInput
            style={[styles.desktopSearchInput, {
              borderColor: theme.colors.border.light,
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              minWidth: 200,
            }]}
            placeholder="Search events..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={filters.searchText}
            onChangeText={(text) => 
              dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text })
            }
          />
        </View>

        {/* Venue Selection */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg, minWidth: 200 }]}>
          <Text variant="caption" color="secondary" style={styles.filterLabel}>
            VENUES
          </Text>
          <TouchableOpacity
            style={[styles.venueSelector, {
              borderColor: theme.colors.border.light,
              backgroundColor: theme.colors.background.secondary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              minWidth: 200,
              maxWidth: 300,
              height: 36,
            }]}
            onPress={() => setShowVenueModal(true)}
            disabled={venuesLoading}
          >
            <Text 
              variant="body2" 
              color={venuesLoading ? 'tertiary' : 'primary'}
              numberOfLines={1}
              style={{ flex: 1, fontSize: 14 }}
            >
              {venuesLoading ? 'Loading venues...' : 'Select venues'}
            </Text>
            {filters.venues.length > 0 && (
              <Text variant="body2" color="secondary" style={{ fontSize: 14 }}>
                ({filters.venues.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Range Picker */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg }]}>
          <DateRangePicker
            label="Date Range"
            value={getDateRangeValue()}
            onChange={handleDateRangeChange}
          />
        </View>

        {/* Category Filter */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg }]}>
          <Text variant="caption" color="secondary" style={styles.filterLabel}>
            CATEGORY
          </Text>
          <View style={styles.filterButtons}>
            {availableCategories.slice(0, 8).map((category) => (
              <Button
                key={category}
                variant={filters.category === category ? 'primary' : 'outline'}
                size="small"
                title={category}
                onPress={() => dispatchFilters({ type: 'SET_CATEGORY', payload: category })}
                style={styles.filterButton}
              />
            ))}
          </View>
        </View>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <View style={styles.filterGroup}>
            <Button
              variant="secondary"
              size="small"
              title={`Clear All (${activeFiltersCount})`}
              onPress={clearAllFilters}
              style={styles.clearButton}
            />
          </View>
        )}
      </ScrollView>
      
      {/* Venue Selection Modal */}
      <VenueSelectionModal
        visible={showVenueModal}
        onClose={() => setShowVenueModal(false)}
        selectedVenues={filters.venues}
        onVenuesChange={handleVenueSelectionChange}
        title="Select Venues"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  
  // Desktop styles
  scrollContent: {
    alignItems: 'flex-start',
    paddingRight: 16,
  },
  filterGroup: {
    alignItems: 'flex-start',
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    marginRight: 8,
    marginBottom: 4,
  },
  desktopSearchInput: {
    borderWidth: 1,
    height: 36,
    fontSize: 14,
  },

  // Mobile styles
  mobileSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    borderWidth: 1,
    height: 44,
    fontSize: 16,
  },
  filterToggle: {
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  mobileFiltersContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  mobileFilterSection: {},
  mobileFilterLabel: {
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  mobileFilterScroll: {
    paddingRight: 16,
  },
  mobileFilterChip: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  clearButton: {
    borderWidth: 1,
    alignItems: 'center',
  },
  venueSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});