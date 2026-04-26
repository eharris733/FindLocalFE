import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useVenuesQuery } from '../hooks/queries/useVenuesQuery';
import { useCityLocation } from '../context/CityContext';
import type { Venue } from '../types/venues';

export default function VenuesRoute() {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const router = useRouter();
  const { selectedCity } = useCityLocation();
  const { data: venues = [], isLoading } = useVenuesQuery(selectedCity);

  const cityVenues = venues
    .filter((v) => !selectedCity || v.city === selectedCity)
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderItem = useCallback(
    ({ item }: { item: Venue }) => (
      <TouchableOpacity
        onPress={() => router.push(`/venue/${item.id}`)}
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surface.raised,
            borderColor: theme.colors.border.light,
          },
        ]}
        activeOpacity={0.85}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: theme.colors.surface.sunken }]} />
        )}
        <View style={styles.rowBody}>
          <Text variant="h4" style={{ color: theme.colors.text.primary }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="body2" color="secondary" numberOfLines={1}>
            {[item.region, item.type].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    ),
    [theme, router]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <FlatList
        data={cityVenues}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          isDesktop && styles.listDesktop,
        ]}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text
              variant="h2"
              style={{
                color: theme.colors.text.primary,
                fontFamily: theme.typography.fontFamily.headingBold,
              }}
            >
              Venues
            </Text>
            <Text variant="body2" color="secondary" style={{ marginTop: 4 }}>
              {cityVenues.length} {cityVenues.length === 1 ? 'venue' : 'venues'} in {selectedCity || 'all cities'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text variant="body2" color="secondary" align="center">
                No venues to show.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  listDesktop: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  headerSection: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  rowBody: {
    flex: 1,
  },
  empty: {
    paddingVertical: 96,
    alignItems: 'center',
  },
});
