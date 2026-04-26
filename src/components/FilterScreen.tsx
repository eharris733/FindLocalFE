import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon, Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useFilters } from '../context/FiltersContext';
import FilterControls from './FilterControls';
import { useEventsQuery } from '../hooks/queries/useEventsQuery';
import { useCityLocation } from '../context/CityContext';
import { filterEvents } from '../hooks/useEvents';

export const FilterScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { filters, reset } = useFilters();
  const { selectedCity } = useCityLocation();
  const { data: events = [] } = useEventsQuery(selectedCity);
  const matchCount = filterEvents(events, filters).length;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background.primary,
            borderBottomColor: theme.colors.border.light,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          style={styles.iconButton}
        >
          <Icon name="close" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text
          variant="h3"
          style={{
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily.headingSemibold,
          }}
        >
          Filters
        </Text>
        <TouchableOpacity onPress={reset} accessibilityRole="button" style={styles.resetButton}>
          <Text variant="label" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      <FilterControls />

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background.primary,
            borderTopColor: theme.colors.border.light,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.applyButton, { backgroundColor: theme.colors.primary[500] }]}
          accessibilityRole="button"
        >
          <Text variant="label" style={{ color: theme.colors.text.inverse, fontWeight: '700' }}>
            Apply Filters
          </Text>
          <View style={[styles.countPill, { backgroundColor: theme.colors.text.inverse + '33' }]}>
            <Text variant="caption" style={{ color: theme.colors.text.inverse, fontWeight: '700' }}>
              {matchCount} {matchCount === 1 ? 'Event' : 'Events'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, bottom: 0 } : {}),
  },
  applyButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
});

export default FilterScreen;
