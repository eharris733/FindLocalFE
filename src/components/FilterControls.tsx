import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Icon, Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useFilters } from '../context/FiltersContext';
import { useCityLocation } from '../context/CityContext';
import { getCityInfo } from '../constants/cities';
import type { WhenFilter, TimeOfDay } from '../types/events';

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

const TIME_OPTIONS: { value: TimeOfDay; label: string; icon: 'clock' }[] = [
  { value: 'morning', label: 'Morning', icon: 'clock' },
  { value: 'afternoon', label: 'Afternoon', icon: 'clock' },
  { value: 'evening', label: 'Evening', icon: 'clock' },
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

interface CityPickerProps {
  cities: { name: string }[];
  selected: string;
  onSelect: (name: string) => void;
}

// Show a search box once the chip cloud stops being scannable at a glance.
const CITY_SEARCH_THRESHOLD = 8;
const NEARBY_COUNT = 4;

const cityChipLabel = (name: string): string => {
  const info = getCityInfo(name);
  return info ? `${info.name}, ${info.state}` : name;
};

const CityPicker: React.FC<CityPickerProps> = ({ cities, selected, onSelect }) => {
  const { theme } = useTheme();
  const { nearbyCities, locationStatus, requestLocation } = useCityLocation();
  const [search, setSearch] = useState('');

  const names = useMemo(() => cities.map((c) => c.name), [cities]);
  const showSearch = names.length > CITY_SEARCH_THRESHOLD;

  const nearby = useMemo(
    () => (locationStatus === 'granted' ? nearbyCities.slice(0, NEARBY_COUNT) : []),
    [locationStatus, nearbyCities]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return names;
    return names.filter((n) => cityChipLabel(n).toLowerCase().includes(q));
  }, [names, search]);

  return (
    <View>
      <View style={[styles.chipRow, { marginBottom: 12 }]}>
        <TouchableOpacity
          onPress={requestLocation}
          disabled={locationStatus === 'locating'}
          accessibilityRole="button"
          accessibilityLabel="Sort cities by distance from my location"
          style={[
            styles.chip,
            styles.locationChip,
            {
              backgroundColor: theme.colors.surface.accent,
              borderColor: locationStatus === 'granted' ? theme.colors.primary[500] : theme.colors.border.light,
            },
          ]}
        >
          <Icon name="location" size={14} color={theme.colors.primary[500]} />
          <Text variant="label" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
            {locationStatus === 'locating'
              ? 'Finding you…'
              : locationStatus === 'granted'
                ? 'Sorted by distance'
                : locationStatus === 'denied'
                  ? 'Location blocked'
                  : 'Near me'}
          </Text>
        </TouchableOpacity>
      </View>

      {nearby.length > 0 && (
        <>
          <Text variant="caption" color="secondary" style={styles.citySubhead}>
            Nearby
          </Text>
          <View style={[styles.chipRow, { marginBottom: 12 }]}>
            {nearby.map((name) => (
              <Chip
                key={`nearby-${name}`}
                label={cityChipLabel(name)}
                active={name === selected}
                onPress={() => onSelect(name)}
              />
            ))}
          </View>
        </>
      )}

      {showSearch && (
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search cities"
          placeholderTextColor={theme.colors.text.tertiary}
          accessibilityLabel="Search cities"
          style={[
            styles.citySearch,
            {
              borderColor: theme.colors.border.light,
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.surface.accent,
            },
          ]}
        />
      )}

      {nearby.length > 0 && (
        <Text variant="caption" color="secondary" style={styles.citySubhead}>
          All cities
        </Text>
      )}
      <View style={styles.chipRow}>
        {filtered.map((name) => (
          <Chip key={name} label={cityChipLabel(name)} active={name === selected} onPress={() => onSelect(name)} />
        ))}
        {filtered.length === 0 && (
          <Text variant="body2" color="secondary">
            No cities match “{search.trim()}”.
          </Text>
        )}
      </View>
    </View>
  );
};

export const FilterControls: React.FC = () => {
  const { theme } = useTheme();
  const { filters, dispatch } = useFilters();
  const { selectedCity, allCityData, onCityChange, availableRegions } = useCityLocation();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {allCityData.length > 1 && (
        <Section title="City">
          <CityPicker
            cities={allCityData}
            selected={selectedCity}
            onSelect={(name) => {
              onCityChange(name);
            }}
          />
        </Section>
      )}

      <Section title="When">
        <View style={styles.chipRow}>
          {WHEN_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={filters.when === opt.value}
              onPress={() => dispatch({ type: 'SET_WHEN', payload: opt.value })}
            />
          ))}
        </View>
      </Section>

      <Section title="What">
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              active={filters.categories.includes(c.value)}
              onPress={() => dispatch({ type: 'TOGGLE_CATEGORY', payload: c.value })}
            />
          ))}
        </View>
      </Section>

      {availableRegions.length > 0 && (
        <Section title="Where">
          <View style={styles.chipRow}>
            {availableRegions.map((r) => (
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

      <Section title="Price">
        <View style={styles.chipRow}>
          <Chip
            label="Free"
            active={filters.free}
            onPress={() => dispatch({ type: 'SET_FREE', payload: !filters.free })}
          />
          <Chip
            label="Paid"
            active={filters.paid}
            onPress={() => dispatch({ type: 'SET_PAID', payload: !filters.paid })}
          />
        </View>
      </Section>

      <Section title="Time of Day">
        <View style={styles.chipRow}>
          {TIME_OPTIONS.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              active={filters.timeOfDay.includes(t.value)}
              onPress={() => dispatch({ type: 'TOGGLE_TIME_OF_DAY', payload: t.value })}
            />
          ))}
        </View>
      </Section>
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
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  citySubhead: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  citySearch: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 14,
  },
});

export default FilterControls;
