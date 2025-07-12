import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet,
  Modal,
  Platform
} from 'react-native';
import { format } from 'date-fns';
import type { EventFilters, FilterAction } from '../types/events';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface FilterControlsProps {
  filters: EventFilters;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  dispatchFilters,
  availableCategories,
  availableLocations,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dateRangeOptions = [
    { value: 'all', label: 'All', emoji: '📅' },
    { value: 'today', label: 'Today', emoji: '🔥' },
    { value: 'tomorrow', label: 'Tomorrow', emoji: '⏰' },
    { value: 'this_week', label: 'Week', emoji: '📆' },
    { value: 'this_weekend', label: 'Weekend', emoji: '🎉' },
    { value: 'this_month', label: 'Month', emoji: '🗓️' },
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category !== 'All') count++;
    if (filters.venue !== 'All') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.searchText) count++;
    return count;
  };

  const getFilterSummary = () => {
    const parts = [];
    if (filters.searchText) parts.push(`"${filters.searchText}"`);
    if (filters.dateRange !== 'all') {
      const option = dateRangeOptions.find(o => o.value === filters.dateRange);
      parts.push(option?.label || 'Custom');
    }
    if (filters.category !== 'All') parts.push(filters.category);
    if (filters.venue !== 'All') parts.push(filters.venue);
    
    return parts.length > 0 ? parts.join(' • ') : 'All events';
  };

  return (
    <View style={styles.container}>
      {/* Main Filter Row */}
      <View style={styles.mainRow}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.text.tertiary}
            value={filters.searchText}
            onChangeText={(text) => 
              dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text })
            }
          />
        </View>

        {/* Quick Date Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickFilters}
          contentContainerStyle={styles.quickFiltersContent}
        >
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.quickFilterChip,
                filters.dateRange === option.value && styles.quickFilterChipActive
              ]}
              onPress={() => 
                dispatchFilters({ type: 'SET_DATE_RANGE', payload: option.value as any })
              }
            >
              <Text style={styles.quickFilterEmoji}>{option.emoji}</Text>
              <Text style={[
                styles.quickFilterText,
                filters.dateRange === option.value && styles.quickFilterTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* More Filters Button */}
        <TouchableOpacity
          style={[
            styles.moreButton,
            getActiveFiltersCount() > 1 && styles.moreButtonActive
          ]}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.moreButtonText}>
            {getActiveFiltersCount() > 1 ? getActiveFiltersCount() : '⚙️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Summary */}
      <View style={styles.summaryRow}>
        {/* <Text style={styles.summaryText} numberOfLines={1}>
          {getFilterSummary()}
        </Text> */}
        
        {getActiveFiltersCount() > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => dispatchFilters({ type: 'RESET_FILTERS' })}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Advanced Filters (Collapsible) */}
      {showAdvanced && (
        <View style={styles.advancedContainer}>
          {/* Categories */}
          <View style={styles.advancedSection}>
            <Text style={styles.advancedLabel}>Categories</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.advancedFiltersContent}
            >
              {availableCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.advancedChip,
                    filters.category === category && styles.advancedChipActive
                  ]}
                  onPress={() => 
                    dispatchFilters({ type: 'SET_CATEGORY', payload: category })
                  }
                >
                  <Text style={[
                    styles.advancedChipText,
                    filters.category === category && styles.advancedChipTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Venues */}
          <View style={styles.advancedSection}>
            <Text style={styles.advancedLabel}>Venues</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.advancedFiltersContent}
            >
              {availableLocations.slice(0, 10).map((location) => ( // Limit to first 10 venues
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.advancedChip,
                    filters.venue === location && styles.advancedChipActive
                  ]}
                  onPress={() => 
                    dispatchFilters({ type: 'SET_LOCATION', payload: location })
                  }
                >
                  <Text style={[
                    styles.advancedChipText,
                    filters.venue === location && styles.advancedChipTextActive
                  ]}>
                    {location}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  
  // Main Filter Row
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    minWidth: 120,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodySmall,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
    height: 36,
  },
  quickFilters: {
    flex: 2,
  },
  quickFiltersContent: {
    paddingRight: spacing.sm,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickFilterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[600],
  },
  quickFilterEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  quickFilterText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  quickFilterTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  moreButton: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  moreButtonActive: {
    backgroundColor: colors.secondary[500],
    borderColor: colors.secondary[600],
  },
  moreButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.secondary,
  },
  summaryText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },

  // Advanced Filters
  advancedContainer: {
    backgroundColor: colors.background.secondary,
    paddingBottom: spacing.sm,
  },
  advancedSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  advancedLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  advancedFiltersContent: {
    paddingRight: spacing.md,
  },
  advancedChip: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  advancedChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[600],
  },
  advancedChipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  advancedChipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

export default FilterControls;
