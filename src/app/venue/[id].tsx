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

const formatTime = (time: string | null): string | null => {
  if (!time || !time.includes(':')) return null;
  const [hStr, mStr] = time.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const isPM = h >= 12;
  const display = isPM ? (h === 12 ? 12 : h - 12) : h === 0 ? 12 : h;
  return `${display}:${m.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
};

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
      <View style={[styles.hero, { backgroundColor: theme.colors.surface.sunken }, !venue.image && styles.heroBare]}>
        {venue.image && (
          <>
            {/* Blurred cover fill behind an uncropped image, so tall photos
                show whole without pushing the venue name below the fold. */}
            <Image source={{ uri: venue.image }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={24} />
            <Image source={{ uri: venue.image }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          </>
        )}
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backOverlay, { backgroundColor: theme.colors.background.primary + 'E6' }]}
        >
          <Icon name="arrow-back" size={20} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>

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
            {[...new Set([venue.type, venue.region, venue.city].filter(Boolean))].join(' · ')}
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
                    {formatTime(event.start_time) ? ` · ${formatTime(event.start_time)}` : ''}
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
    maxHeight: 320,
    overflow: 'hidden',
  },
  // No image: just enough room to host the floating back button.
  heroBare: {
    aspectRatio: undefined,
    height: 64,
  },
  backOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
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
