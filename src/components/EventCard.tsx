import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ImageSourcePropType } from 'react-native';
import { Icon, Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { format, parseISO } from 'date-fns';

interface EventCardProps {
  event: Event;
  venue?: Venue | null;
  onPress: () => void;
}

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

const formatDateLabel = (event: Event): string => {
  if (!event.event_date) return '';
  const date = parseISO(event.event_date);
  const datePart = format(date, 'EEE · MMM d').toUpperCase();
  const timePart = formatTime(event.start_time);
  return timePart ? `${datePart} · ${timePart}` : datePart;
};

const formatPrice = (event: Event): string => {
  if (event.price_amount === 0) return 'Free';
  if (event.price) return event.price;
  if (event.price_amount && event.price_amount > 0) return `$${event.price_amount}`;
  return '';
};

export const EventCard: React.FC<EventCardProps> = ({ event, venue, onPress }) => {
  const { theme } = useTheme();
  const dateLabel = formatDateLabel(event);
  const priceLabel = formatPrice(event);
  const venueName = venue?.name ?? event.custom_location ?? '';
  const region = event.region;

  const imageSource: ImageSourcePropType = event.image_url
    ? { uri: event.image_url }
    : venue?.image
      ? { uri: venue.image }
      : require('../../assets/record.png');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={[styles.imageWrapper, { backgroundColor: theme.colors.surface.sunken }]}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        {priceLabel ? (
          <View style={[styles.pricePill, { backgroundColor: theme.colors.background.primary + 'E6' }]}>
            <Text
              variant="caption"
              style={{ color: theme.colors.text.primary, fontWeight: '600' }}
            >
              {priceLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {dateLabel ? (
          <Text
            variant="caption"
            style={[styles.dateLabel, { color: theme.colors.secondary[500] }]}
          >
            {dateLabel}
          </Text>
        ) : null}
        {event.title ? (
          <Text
            variant="h4"
            style={[styles.title, { color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.headingSemibold }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>
        ) : null}
        {(venueName || region) && (
          <View style={styles.locationRow}>
            <Icon name="location" size={14} color={theme.colors.text.tertiary} />
            <Text
              variant="body2"
              style={[styles.locationText, { color: theme.colors.text.secondary }]}
              numberOfLines={1}
            >
              {[venueName, region].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 24,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pricePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  body: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  dateLabel: {
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    flex: 1,
  },
});

export default EventCard;
