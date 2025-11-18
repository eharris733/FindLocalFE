import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';

interface CategoryPillsProps {
  selectedCategory: string | string[];
  onCategoryChange: (category: string | string[]) => void;
  selectedDateRange?: string;
  onDateRangeChange?: (dateRange: string) => void;
}

const dateRanges = [
  { id: 'all', label: 'All', emoji: '📅' },
  { id: 'today', label: 'Today', emoji: '📅' },
  { id: 'tomorrow', label: 'Tomorrow', emoji: '📆' },
  { id: 'this_week', label: 'This Week', emoji: '📋' },
];

const categories = [
  { id: 'all', label: 'All', emoji: '🎭' },
  { id: 'favorites', label: 'Favorites', emoji: '❤️' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'bar', label: 'Bar', emoji: '🍺' },
  { id: 'theater', label: 'Theater', emoji: '🎭' },
  { id: 'comedy', label: 'Comedy', emoji: '😄' },
  { id: 'other', label: 'Other', emoji: '🎪' },
];

const CategoryPillsComponent: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onCategoryChange,
  selectedDateRange,
  onDateRangeChange,
}) => {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();

  // Normalize selectedCategory to array for easier checking
  const selectedCategories = Array.isArray(selectedCategory) ? selectedCategory : [selectedCategory];

  const handleCategoryPress = (categoryId: string) => {
    if (categoryId === 'all') {
      // Clicking "All" always sets it to just "all"
      onCategoryChange('all');
    } else {
      // Remove 'all' from current selection
      let newSelection = selectedCategories.filter(c => c !== 'all');
      
      if (newSelection.includes(categoryId)) {
        // Toggle off - remove this category
        newSelection = newSelection.filter(c => c !== categoryId);
        
        // If nothing is selected, default back to 'all'
        if (newSelection.length === 0) {
          onCategoryChange('all');
        } else {
          onCategoryChange(newSelection);
        }
      } else {
        // Toggle on - add this category
        newSelection = [...newSelection, categoryId];
        onCategoryChange(newSelection);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingHorizontal: isMobile ? 12 : 16 }]}>
      <ScrollView
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: isMobile ? 12 : 16 }]}
        style={{ flexGrow: 0 }} // Prevent ScrollView from expanding vertically
      >
        {/* Date Range Pills */}
        {onDateRangeChange && selectedDateRange && dateRanges.map((dateRange) => {
          const isSelected = selectedDateRange === dateRange.id;
          // Use shorter label on mobile for "This Week"
          const displayLabel = isMobile && dateRange.id === 'this_week' ? 'Week' : dateRange.label;
          
          return (
            <TouchableOpacity
              key={dateRange.id}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected 
                    ? theme.colors.secondary[500] 
                    : theme.colors.background.secondary,
                  borderColor: isSelected
                    ? theme.colors.secondary[500]
                    : theme.colors.border.light,
                }
              ]}
              onPress={() => onDateRangeChange(dateRange.id)}
            >
              <Text 
                variant="body2" 
                color={isSelected ? 'inverse' : 'secondary'}
                style={styles.label}
              >
                {displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Divider */}
        {onDateRangeChange && selectedDateRange && (
          <View style={[styles.divider, { backgroundColor: theme.colors.border.light }]} />
        )}
        
        {/* Category Pills */}
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected 
                    ? theme.colors.primary[500] 
                    : theme.colors.background.secondary,
                  borderColor: isSelected
                    ? theme.colors.primary[500]
                    : theme.colors.border.light,
                }
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Text variant="body2" style={styles.emoji}>
                {category.emoji}
              </Text>
              <Text 
                variant="body2" 
                color={isSelected ? 'inverse' : 'secondary'}
                style={styles.label}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    width: '100%', // Ensure full width on mobile
  },
  scrollContent: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  emoji: {
    marginRight: 4,
    fontSize: 12,
  },
  label: {
    fontWeight: '500',
    fontSize: 13,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
});

export const CategoryPills = React.memo(CategoryPillsComponent);
