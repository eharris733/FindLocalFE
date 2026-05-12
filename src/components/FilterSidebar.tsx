import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters } from '../hooks/useEvents';
import FilterControls from './FilterControls';

export const FilterSidebar: React.FC = () => {
  const { theme } = useTheme();
  const { filters, reset } = useFilters();
  const activeCount = countActiveFilters(filters);

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: theme.colors.background.primary,
          borderRightColor: theme.colors.border.light,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
        <Text
          variant="h3"
          style={{ color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.headingSemibold }}
        >
          Filters
        </Text>
        {activeCount > 0 && (
          <TouchableOpacity onPress={reset} accessibilityRole="button">
            <Text variant="label" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
              Reset · {activeCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <FilterControls />
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 300,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default FilterSidebar;
