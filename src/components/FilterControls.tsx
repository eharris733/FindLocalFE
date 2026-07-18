import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useFilters } from '../context/FiltersContext';
import { useCityLocation } from '../context/CityContext';
import { useEventsQuery } from '../hooks/queries/useEventsQuery';
import { useVenuesQuery } from '../hooks/queries/useVenuesQuery';
import { filterEvents } from '../hooks/useEvents';
import CityDropdown from './CityDropdown';
import type { FilterState, WhenFilter, TimeOfDay } from '../types/events';

const WHEN_OPTIONS: { value: WhenFilter; label: string }[] = [
  { value: 'anytime', label: 'Anytime' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_weekend', label: 'This Weekend' },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'music', label: 'Live Music' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'theater', label: 'Theater' },
  { value: 'art', label: 'Art & Culture' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'family', label: 'Family Friendly' },
  { value: 'market', label: 'Markets' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'community', label: 'Community' },
  { value: 'festival', label: 'Festival' },
];

const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, active, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.colors.primary[500] : theme.colors.surface.accent,
          borderColor: active ? theme.colors.primary[500] : theme.colors.border.light,
        },
      ]}
    >
      <Text
        variant="label"
        style={{
          color: active ? theme.colors.text.inverse : theme.colors.text.secondary,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text
        variant="h4"
        style={[styles.sectionTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.headingSemibold }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
};

export const FilterControls: React.FC = () => {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const { filters, dispatch } = useFilters();
  const { selectedCity, allCityData } = useCityLocation();

  // Same query keys as the feed, so these are cache hits, not extra fetches.
  const { data: events = [] } = useEventsQuery(selectedCity);
  const { data: venues = [] } = useVenuesQuery(selectedCity);

  const venueNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of venues) if (v.name) map.set(v.id, v.name);
    return map;
  }, [venues]);

  // An option is offered only if choosing it — as the sole selection in its
  // group, with every other group's current filters applied — matches at
  // least one event. Active options always stay visible so they can be
  // toggled off. While events are still loading we can't know availability,
  // so everything shows.
  const wouldMatch = useMemo(() => {
    return (patch: Partial<FilterState>): boolean => {
      if (events.length === 0) return true;
      return filterEvents(events, { ...filters, ...patch }, venueNames).length > 0;
    };
  }, [events, filters, venueNames]);

  const visibleWhen = useMemo(
    () =>
      WHEN_OPTIONS.filter(
        (opt) =>
          opt.value === 'anytime' ||
          filters.when === opt.value ||
          wouldMatch({ when: opt.value })
      ),
    [filters.when, wouldMatch]
  );

  const visibleCategories = useMemo(
    () =>
      CATEGORIES.filter(
        (c) => filters.categories.includes(c.value) || wouldMatch({ categories: [c.value] })
      ),
    [filters.categories, wouldMatch]
  );

  // Regions come from the events themselves rather than the venue table, so a
  // region with venues but no current events doesn't show a dead chip.
  const visibleRegions = useMemo(() => {
    const fromEvents = new Set<string>();
    for (const e of filterEvents(events, { ...filters, regions: [] }, venueNames)) {
      if (e.region) fromEvents.add(e.region);
    }
    for (const r of filters.regions) fromEvents.add(r);
    return [...fromEvents].sort((a, b) => a.localeCompare(b));
  }, [events, filters, venueNames]);

  const visibleTimes = useMemo(
    () =>
      TIME_OPTIONS.filter(
        (t) => filters.timeOfDay.includes(t.value) || wouldMatch({ timeOfDay: [t.value] })
      ),
    [filters.timeOfDay, wouldMatch]
  );

  const showFree = filters.free || wouldMatch({ free: true, paid: false });
  const showPaid = filters.paid || wouldMatch({ free: false, paid: true });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Desktop already has the header search bar; give mobile one here. */}
      {!isDesktop && (
        <Section title="Search">
          <TextInput
            value={filters.query ?? ''}
            onChangeText={(text) => dispatch({ type: 'SET_QUERY', payload: text })}
            placeholder="Search events or venues"
            placeholderTextColor={theme.colors.text.tertiary}
            accessibilityLabel="Search events"
            returnKeyType="search"
            style={[
              styles.searchInput,
              {
                borderColor: theme.colors.border.light,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.surface.accent,
              },
            ]}
          />
        </Section>
      )}

      {allCityData.length > 1 && (
        <Section title="City">
          <CityDropdown />
        </Section>
      )}

      {visibleWhen.length > 1 && (
        <Section title="When">
          <View style={styles.chipRow}>
            {visibleWhen.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={filters.when === opt.value}
                onPress={() => dispatch({ type: 'SET_WHEN', payload: opt.value })}
              />
            ))}
          </View>
        </Section>
      )}

      {visibleCategories.length > 0 && (
        <Section title="What">
          <View style={styles.chipRow}>
            {visibleCategories.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                active={filters.categories.includes(c.value)}
                onPress={() => dispatch({ type: 'TOGGLE_CATEGORY', payload: c.value })}
              />
            ))}
          </View>
        </Section>
      )}

      {visibleRegions.length > 0 && (
        <Section title="Where">
          <View style={styles.chipRow}>
            {visibleRegions.map((r) => (
              <Chip
                key={r}
                label={r}
                active={filters.regions.includes(r)}
                onPress={() => dispatch({ type: 'TOGGLE_REGION', payload: r })}
              />
            ))}
          </View>
        </Section>
      )}

      {(showFree || showPaid) && (
        <Section title="Price">
          <View style={styles.chipRow}>
            {showFree && (
              <Chip
                label="Free"
                active={filters.free}
                onPress={() => dispatch({ type: 'SET_FREE', payload: !filters.free })}
              />
            )}
            {showPaid && (
              <Chip
                label="Paid"
                active={filters.paid}
                onPress={() => dispatch({ type: 'SET_PAID', payload: !filters.paid })}
              />
            )}
          </View>
        </Section>
      )}

      {visibleTimes.length > 0 && (
        <Section title="Time of Day">
          <View style={styles.chipRow}>
            {visibleTimes.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                active={filters.timeOfDay.includes(t.value)}
                onPress={() => dispatch({ type: 'TOGGLE_TIME_OF_DAY', payload: t.value })}
              />
            ))}
          </View>
        </Section>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
});

export default FilterControls;
