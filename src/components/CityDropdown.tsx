import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import { Icon, Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useCityLocation } from '../context/CityContext';
import { getCityInfo } from '../constants/cities';

const cityLabel = (name: string): string => {
  const info = getCityInfo(name);
  return info ? `${info.name}, ${info.state}` : name;
};

/**
 * City selector as a dropdown: a trigger showing the current city that opens
 * a searchable, alphabetical list. "Use my location" hands off to
 * CityContext, which picks the nearest city and switches the feed to
 * distance sort — the list itself always stays alphabetical.
 */
export const CityDropdown: React.FC = () => {
  const { theme } = useTheme();
  const { selectedCity, allCityData, onCityChange, locationStatus, requestLocation } =
    useCityLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // allCityData arrives alphabetically sorted from CityContext.
  const names = useMemo(() => allCityData.map((c) => c.name), [allCityData]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return names;
    return names.filter((n) => cityLabel(n).toLowerCase().includes(q));
  }, [names, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const select = (name: string) => {
    onCityChange(name);
    close();
  };

  const handleUseLocation = () => {
    requestLocation();
    close();
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Change city, currently ${cityLabel(selectedCity)}`}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.colors.surface.accent,
            borderColor: theme.colors.border.light,
          },
        ]}
      >
        <Icon name="location" size={16} color={theme.colors.primary[500]} />
        <Text
          variant="body1"
          style={[styles.triggerLabel, { color: theme.colors.text.primary }]}
          numberOfLines={1}
        >
          {selectedCity ? cityLabel(selectedCity) : 'Choose a city'}
        </Text>
        <Icon name="chevron-down" size={16} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.panel,
              {
                backgroundColor: theme.colors.background.primary,
                borderColor: theme.colors.border.light,
              },
            ]}
          >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search cities"
              placeholderTextColor={theme.colors.text.tertiary}
              accessibilityLabel="Search cities"
              autoFocus
              style={[
                styles.search,
                {
                  borderColor: theme.colors.border.light,
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.surface.accent,
                },
              ]}
            />

            <TouchableOpacity
              onPress={handleUseLocation}
              disabled={locationStatus === 'locating'}
              accessibilityRole="button"
              accessibilityLabel="Use my location to pick the nearest city"
              style={styles.row}
            >
              <Icon name="location" size={16} color={theme.colors.primary[500]} />
              <Text
                variant="body1"
                style={{ color: theme.colors.primary[500], fontWeight: '600', marginLeft: 8 }}
              >
                {locationStatus === 'locating'
                  ? 'Finding you…'
                  : locationStatus === 'denied'
                    ? 'Location blocked in browser settings'
                    : 'Use my location'}
              </Text>
            </TouchableOpacity>

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {filtered.map((name) => {
                const active = name === selectedCity;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => select(name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.row,
                      active && { backgroundColor: theme.colors.surface.accent },
                    ]}
                  >
                    <Text
                      variant="body1"
                      style={{
                        color: active ? theme.colors.primary[500] : theme.colors.text.primary,
                        fontWeight: active ? '700' : '400',
                        flex: 1,
                      }}
                    >
                      {cityLabel(name)}
                    </Text>
                    {active && <Icon name="chevron-right" size={16} color={theme.colors.primary[500]} />}
                  </TouchableOpacity>
                );
              })}
              {filtered.length === 0 && (
                <Text variant="body2" color="secondary" style={{ padding: 12 }}>
                  No cities match “{search.trim()}”.
                </Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerLabel: {
    flex: 1,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: 480,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  list: {
    flexGrow: 0,
  },
});

export default CityDropdown;
