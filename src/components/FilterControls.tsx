import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet 
} from 'react-native';
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
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search events..."
          placeholderTextColor={colors.text.tertiary}
          value={filters.searchText}
          onChangeText={(text) => 
            dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text })
          }
        />
      </View>
      
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {availableCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              filters.category === category && styles.filterChipActive
            ]}
            onPress={() => 
              dispatchFilters({ type: 'SET_CATEGORY', payload: category })
            }
          >
            <Text style={[
              styles.filterChipText,
              filters.category === category && styles.filterChipTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <Text style={styles.sectionTitle}>Venues</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {availableLocations.map((location) => (
          <TouchableOpacity
            key={location}
            style={[
              styles.filterChip,
              filters.venue === location && styles.filterChipActive
            ]}
            onPress={() => 
              dispatchFilters({ type: 'SET_LOCATION', payload: location })
            }
          >
            <Text style={[
              styles.filterChipText,
              filters.venue === location && styles.filterChipTextActive
            ]}>
              {location}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => dispatchFilters({ type: 'RESET_FILTERS' })}
      >
        <Text style={styles.resetButtonText}>🔄 Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.small,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  },
  sectionTitle: {
    ...typography.heading4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  scrollView: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingRight: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: colors.secondary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignSelf: 'center',
    marginTop: spacing.sm,
    ...shadows.small,
  },
  resetButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});

export default FilterControls;
