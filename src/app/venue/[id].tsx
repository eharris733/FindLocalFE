import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Venue } from '../../types/venues';
import type { Event } from '../../types/events';
import { getVenueById } from '../../api/venues';
import { getUpcomingEventsForVenue } from '../../api/events';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Text } from '../../components/ui';
import { openMaps } from '../../utils/linkUtils';
import { logger } from '../../utils/logger';
import { format, parseISO } from 'date-fns';

export default function VenuePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const v = await getVenueById(id);
        if (cancelled) return;
        if (!v) {
          setError('Venue not found');
          return;
        }
        setVenue(v);
        const events = await getUpcomingEventsForVenue(id, 12);
        if (!cancelled) setUpcoming(events);
      } catch (err) {
        if (!cancelled) {
          logger.error('Error fetching venue:', err);
          setError('Failed to load venue');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAddressPress = () => {
    if (venue?.address) openMaps(venue.address);
  };

  const handleWebsitePress = () => {
    if (venue?.url) Linking.openURL(venue.url);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (error || !venue) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background.primary, padding: 32 }]}>
        <Text variant="h3" align="center" style={{ color: theme.colors.text.primary, marginBottom: 12 }}>
          Venue not found
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary[500] }]}
        >
          <Text variant="label" style={{ color: theme.colors.text.inverse, fontWeight: '700' }}>
            Browse events
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background.primary }}
      contentContainerStyle={styles.scroll}
    >
      {venue.image && <Image source={{ uri: venue.image }} style={styles.hero} resizeMode="cover" />}

      <View style={styles.body}>
        <Text
          variant="h1"
          style={{
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily.headingBold,
            marginBottom: 8,
          }}
        >
          {venue.name}
        </Text>

        {(venue.region || venue.city || venue.type) && (
          <Text variant="body2" color="secondary" style={{ marginBottom: 16 }}>
            {[venue.type, venue.region, venue.city].filter(Boolean).join(' · ')}
          </Text>
        )}

        {venue.address && (
          <TouchableOpacity onPress={handleAddressPress} style={styles.metaRow}>
            <Icon name="location" size={18} color={theme.colors.primary[500]} />
            <Text variant="body1" style={{ color: theme.colors.text.primary, marginLeft: 8, flex: 1 }}>
              {venue.address}
            </Text>
          </TouchableOpacity>
        )}

        {venue.url && (
          <TouchableOpacity
            onPress={handleWebsitePress}
            style={[styles.linkRow, { borderColor: theme.colors.border.light }]}
          >
            <Text variant="label" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
              Visit website
            </Text>
          </TouchableOpacity>
        )}

        {venue.description && (
          <View style={[styles.descriptionCard, { backgroundColor: theme.colors.surface.sunken }]}>
            <Text
              variant="h4"
              style={{
                color: theme.colors.text.primary,
                marginBottom: 8,
                fontFamily: theme.typography.fontFamily.headingSemibold,
              }}
            >
              About
            </Text>
            <Text variant="body1" style={{ color: theme.colors.text.secondary, lineHeight: 24 }}>
              {venue.description}
            </Text>
          </View>
        )}

        <Text
          variant="h3"
          style={{
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily.headingSemibold,
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          Upcoming events
        </Text>

        {upcoming.length === 0 ? (
          <Text variant="body2" color="secondary">
            No upcoming events at this venue.
          </Text>
        ) : (
          upcoming.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => router.push(`/event/${event.id}`)}
              style={[
                styles.eventRow,
                {
                  backgroundColor: theme.colors.surface.raised,
                  borderColor: theme.colors.border.light,
                },
              ]}
              activeOpacity={0.85}
            >
              {event.image_url ? (
                <Image source={{ uri: event.image_url }} style={styles.eventThumb} />
              ) : (
                <View style={[styles.eventThumb, { backgroundColor: theme.colors.surface.sunken }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }} numberOfLines={2}>
                  {event.title}
                </Text>
                {event.event_date && (
                  <Text variant="caption" color="secondary" style={{ marginTop: 4 }}>
                    {format(parseISO(event.event_date), 'EEE · MMM d')}
                    {event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ''}
                  </Text>
                )}
              </View>
              <Icon name="chevron-right" size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkRow: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 16,
    alignItems: 'center',
  },
  descriptionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginBottom: 12,
  },
  eventThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  primaryButton: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
