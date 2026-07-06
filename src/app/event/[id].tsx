import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Event } from '../../types/events';
import type { Venue } from '../../types/venues';
import { getEventByIdWithFallback, getUpcomingSeriesDates } from '../../api/events';
import { getVenueById } from '../../api/venues';
import { showToast } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Text } from '../../components/ui';
import { useFavorites } from '../../context/FavoritesContext';
import { addToGoogleCalendar, addToAppleCalendar } from '../../utils/calendarUtils';
import { openMaps } from '../../utils/linkUtils';
import { logger } from '../../utils/logger';
import { format, parseISO, startOfDay } from 'date-fns';
import { EventPageSchema } from '../../components/EventPageSchema';

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

export default function EventPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [seriesDates, setSeriesDates] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const { event: eventData, isExpired: expired } = await getEventByIdWithFallback(id);
        if (cancelled) return;
        if (!eventData) {
          setError('Event not found');
          return;
        }
        setEvent(eventData);
        setIsExpired(expired);
        if (eventData.venue_id && eventData.title) {
          getUpcomingSeriesDates(eventData.venue_id, eventData.title)
            .then((dates) => {
              if (!cancelled) setSeriesDates(dates);
            })
            .catch((err) => logger.warn('Could not fetch series dates:', err));
        }
        if (eventData.venue_id) {
          try {
            const v = await getVenueById(eventData.venue_id);
            if (!cancelled && v) setVenue(v);
          } catch (err) {
            logger.warn('Could not fetch venue:', err);
          }
        }
      } catch (err) {
        if (!cancelled) {
          logger.error('Error fetching event:', err);
          setError('Failed to load event');
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

  const handleShare = async () => {
    if (!event) return;
    const baseUrl =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'https://findlocal.community';
    const shareUrl = `${baseUrl}/event/${event.id}`;
    const message = `Check out ${event.title}`;

    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: event.title || '', text: message, url: shareUrl });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          // Alert.alert is a no-op on react-native-web; toast actually renders.
          showToast('Event link copied to clipboard');
        }
      } else {
        await Share.share({ message: `${message}\n${shareUrl}`, url: shareUrl, title: event.title || '' });
      }
    } catch (err: any) {
      if (err?.message !== 'User cancelled') logger.warn('Share failed:', err);
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    if (Platform.OS === 'web') {
      addToGoogleCalendar(event, venue);
    } else {
      Alert.alert(
        'Add to Calendar',
        'Choose your calendar',
        [
          { text: 'Google', onPress: () => addToGoogleCalendar(event, venue) },
          { text: 'Apple', onPress: () => addToAppleCalendar(event, venue) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleSave = () => {
    if (!event) return;
    toggleFavorite(event.id);
  };

  const handleVenuePress = () => {
    if (!venue) return;
    router.push(`/venue/${venue.id}`);
  };

  const handleAddressPress = () => {
    if (venue?.address) openMaps(venue.address);
  };

  const handleTickets = () => {
    if (!event) return;
    const url = event.ticket_page_url || event.detail_page_url || event.root_url || venue?.url;
    if (url) Linking.openURL(url);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const imageUri = event?.image_url || venue?.image || null;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background.primary, padding: 32 }]}>
        <Text variant="h3" align="center" style={{ color: theme.colors.text.primary, marginBottom: 12 }}>
          Event not found
        </Text>
        <Text variant="body2" color="secondary" align="center" style={{ marginBottom: 24 }}>
          We couldn't find this event. It may have been removed.
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

  const dateLabel = event.event_date
    ? format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')
    : null;
  const timeLabel = formatTime(event.start_time);
  const saved = isFavorite(event.id);
  const ticketsUrl = event.ticket_page_url || event.detail_page_url || event.root_url || venue?.url;
  const displayExpired =
    isExpired ||
    (event.event_date ? parseISO(event.event_date) < startOfDay(new Date()) : false);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background.primary }}
      contentContainerStyle={styles.scroll}
    >
      <EventPageSchema event={event} venue={venue} />

      <View
        style={[
          styles.hero,
          styles.heroPlaceholder,
          { backgroundColor: theme.colors.surface.sunken },
        ]}
      >
        <Icon name="calendar" size={48} color={theme.colors.text.tertiary} />
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backButton, { borderColor: theme.colors.border.light }]}
        >
          <Icon name="arrow-back" size={18} color={theme.colors.primary[500]} />
          <Text variant="label" style={{ color: theme.colors.primary[500], marginLeft: 6, fontWeight: '600' }}>
            Back
          </Text>
        </TouchableOpacity>

        {displayExpired && (
          <View style={[styles.banner, { backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning }]}>
            <Text variant="body2" style={{ color: theme.colors.text.primary }}>
              This event has already passed.
            </Text>
          </View>
        )}

        <Text
          variant="h1"
          style={{
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily.headingBold,
            marginBottom: 12,
          }}
        >
          {event.title}
        </Text>

        {dateLabel && (
          <View style={styles.metaRow}>
            <Icon name="calendar" size={18} color={theme.colors.primary[500]} />
            <Text variant="body1" style={{ color: theme.colors.text.primary, marginLeft: 8 }}>
              {dateLabel}
              {timeLabel ? ` · ${timeLabel}` : ''}
            </Text>
          </View>
        )}

        {seriesDates.length > 1 && (
          <View style={styles.metaRow}>
            <Text variant="body1" style={{ color: theme.colors.primary[500] }}>↻</Text>
            <Text variant="body2" style={{ color: theme.colors.text.secondary, marginLeft: 8, flex: 1 }}>
              Recurring event · {seriesDates.length} upcoming dates
              {(() => {
                const next = seriesDates.find((d) => d !== event.event_date);
                return next ? ` (also ${format(parseISO(next), 'EEE, MMM d')})` : '';
              })()}
            </Text>
          </View>
        )}

        {(venue || event.custom_location) && (
          <TouchableOpacity onPress={venue ? handleVenuePress : handleAddressPress} style={styles.metaRow}>
            <Icon name="location" size={18} color={theme.colors.primary[500]} />
            <Text
              variant="body1"
              style={{ color: theme.colors.text.primary, marginLeft: 8, flex: 1 }}
              numberOfLines={2}
            >
              {venue?.name || event.custom_location}
              {venue?.address ? ` · ${venue.address}` : ''}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleShare} style={[styles.actionButton, { borderColor: theme.colors.border.light }]}>
            <Icon name="share" size={18} color={theme.colors.primary[500]} />
            <Text variant="label" style={{ color: theme.colors.primary[500], marginLeft: 6, fontWeight: '600' }}>
              Share
            </Text>
          </TouchableOpacity>
          {event.event_date && (
            <TouchableOpacity
              onPress={handleAddToCalendar}
              style={[styles.actionButton, { borderColor: theme.colors.border.light }]}
            >
              <Icon name="calendar" size={18} color={theme.colors.primary[500]} />
              <Text variant="label" style={{ color: theme.colors.primary[500], marginLeft: 6, fontWeight: '600' }}>
                Calendar
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.actionButton,
              {
                borderColor: saved ? theme.colors.primary[500] : theme.colors.border.light,
                backgroundColor: saved ? theme.colors.primary[500] : 'transparent',
              },
            ]}
          >
            <Icon
              name={saved ? 'heart-filled' : 'heart'}
              size={18}
              color={saved ? theme.colors.text.inverse : theme.colors.primary[500]}
            />
            <Text
              variant="label"
              style={{
                color: saved ? theme.colors.text.inverse : theme.colors.primary[500],
                marginLeft: 6,
                fontWeight: '600',
              }}
            >
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {!displayExpired && ticketsUrl && (
          <TouchableOpacity
            onPress={handleTickets}
            style={[styles.primaryButton, { backgroundColor: theme.colors.secondary[500], marginBottom: 24 }]}
          >
            <Text variant="label" style={{ color: theme.colors.text.inverse, fontWeight: '700' }}>
              {event.ticket_page_url ? 'Buy tickets' : 'Visit event page'}
            </Text>
          </TouchableOpacity>
        )}

        {event.description && (
          <View style={[styles.descriptionCard, { backgroundColor: theme.colors.surface.sunken }]}>
            <Text
              variant="h4"
              style={{
                color: theme.colors.text.primary,
                marginBottom: 8,
                fontFamily: theme.typography.fontFamily.headingSemibold,
              }}
            >
              About this event
            </Text>
            <Text variant="body1" style={{ color: theme.colors.text.secondary, lineHeight: 24 }}>
              {event.description}
            </Text>
          </View>
        )}

        {venue && (
          <View style={[styles.descriptionCard, { backgroundColor: theme.colors.surface.sunken }]}>
            <Text
              variant="h4"
              style={{
                color: theme.colors.text.primary,
                marginBottom: 8,
                fontFamily: theme.typography.fontFamily.headingSemibold,
              }}
            >
              Venue
            </Text>
            <TouchableOpacity onPress={handleVenuePress}>
              <Text variant="body1" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
                {venue.name}
              </Text>
            </TouchableOpacity>
            {venue.address && (
              <TouchableOpacity onPress={handleAddressPress}>
                <Text variant="body2" color="secondary" style={{ marginTop: 4 }}>
                  {venue.address}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    ...(Platform.OS === 'web' ? { maxHeight: 360 } : {}),
  },
  heroPlaceholder: {
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: 16,
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
});
