import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button, Text, SearchableDropdown, DateRangePicker } from './ui';
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
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const quickDateOptions = [
    { value: 'today', label: 'Today', emoji: '🔥' },
    { value: 'tomorrow', label: 'Tomorrow', emoji: '⏰' },
    { value: 'this_week', label: 'Week', emoji: '📆' },
  ];

  const activeFiltersCount = Object.values(filters).filter(
    value => value !== '' && value !== 'all' && value !== null
  ).length;

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
            {/* Venue Dropdown */}
            <View style={[styles.mobileFilterSection, { marginBottom: theme.spacing.md }]}>
              <SearchableDropdown
                label="Venues"
                data={availableLocations}
                value={filters.location}
                onSelect={(value) => dispatchFilters({ type: 'SET_LOCATION', payload: value })}
                placeholder="Search venues..."
                maxHeight={150}
              />
            </View>

            {/* Date Range Picker */}
            <View style={[styles.mobileFilterSection, { marginBottom: theme.spacing.md }]}>
              <DateRangePicker
                label="Date Range"
                value={getDateRangeValue()}
                onChange={handleDateRangeChange}
              />
            </View>

            {/* Quick Date Filters */}
            <View style={[styles.mobileFilterSection, { marginBottom: theme.spacing.md }]}>
              <Text variant="caption" color="secondary" style={styles.mobileFilterLabel}>
                QUICK SELECT
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mobileFilterScroll}
              >
                {quickDateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.mobileFilterChip,
                      {
                        backgroundColor: filters.dateRange === option.value 
                          ? theme.colors.primary[500] 
                          : theme.colors.background.primary,
                        borderColor: filters.dateRange === option.value 
                          ? theme.colors.primary[600] 
                          : theme.colors.border.light,
                        paddingHorizontal: theme.spacing.sm,
                        paddingVertical: theme.spacing.xs,
                        borderRadius: theme.borderRadius.md,
                        marginRight: theme.spacing.xs,
                      }
                    ]}
                    onPress={() => 
                      dispatchFilters({ type: 'SET_DATE_RANGE', payload: option.value as any })
                    }
                  >
                    <Text variant="body2" style={{ marginRight: 4 }}>
                      {option.emoji}
                    </Text>
                    <Text 
                      variant="caption" 
                      color={filters.dateRange === option.value ? 'inverse' : 'secondary'}
                      style={{ fontWeight: '500' }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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

        {/* Venue Dropdown */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg, minWidth: 200 }]}>
          <SearchableDropdown
            label="Venues"
            data={availableLocations}
            value={filters.location}
            onSelect={(value) => dispatchFilters({ type: 'SET_LOCATION', payload: value })}
            placeholder="Search venues..."
            maxHeight={200}
            minWidth={200}
            maxWidth={300}
          />
        </View>

        {/* Date Range Picker */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg }]}>
          <DateRangePicker
            label="Date Range"
            value={getDateRangeValue()}
            onChange={handleDateRangeChange}
          />
        </View>

        {/* Quick Date Filters */}
        <View style={[styles.filterGroup, { marginRight: theme.spacing.lg }]}>
          <Text variant="caption" color="secondary" style={styles.filterLabel}>
            QUICK SELECT
          </Text>
          <View style={styles.filterButtons}>
            {quickDateOptions.map((option) => (
              <Button
                key={option.value}
                variant={filters.dateRange === option.value ? 'primary' : 'outline'}
                size="small"
                title={`${option.emoji} ${option.label}`}
                onPress={() => dispatchFilters({ type: 'SET_DATE_RANGE', payload: option.value as any })}
                style={styles.filterButton}
              />
            ))}
          </View>
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
});