import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void; // Add onPress prop for venue modal
}

function formatMilitaryTime(time: string): string {
  if (!time || typeof time !== 'string' || !time.includes(':')) {
    return time;
  }

  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return time;
  }

  const isPM = hours >= 12;
  const formattedHours = isPM ? (hours === 12 ? 12 : hours - 12) : (hours === 0 ? 12 : hours);
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes} ${isPM ? 'PM' : 'AM'}`;
}

const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const handleCardPress = () => {
    if (onPress) {
      onPress(event); // Show venue modal
    } else if (event.url) {
      Linking.openURL(event.url); // Fallback to opening event URL
    }
  };

  // Determine the image source
  const imageSource = event.preview_image 
    ? { uri: event.preview_image }
    : require('../../assets/music.png'); // Use require for local assets

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress}>
      <View style={styles.cardContent}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
        />
        
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          
          <View style={styles.metaInfo}>
            <Text style={styles.date}>
              {format(new Date(event.event_date), 'MMM dd, yyyy')}
            </Text>
            {event.time && (
              <Text style={styles.time}>
                {formatMilitaryTime(event.time)}
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.venueContainer}
            onPress={handleCardPress}
          >
            <Text style={styles.venue} numberOfLines={1}>
              📍 {event.venue_name}
            </Text>
            <Text style={styles.venueHint}>Tap for venue details</Text>
          </TouchableOpacity>
          
          {event.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.category}>{event.category}</Text>
            </View>
          )}
          
          {event.description && (
            <Text style={styles.description} numberOfLines={2}>
              {event.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.gray[100],
  },
  textContent: {
    flex: 1,
  },
  title: {
    ...typography.heading4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
    marginRight: spacing.md,
  },
  time: {
    ...typography.bodySmall,
    color: colors.secondary[500],
    fontWeight: '600',
  },
  venueContainer: {
    marginBottom: spacing.sm,
  },
  venue: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  venueHint: {
    ...typography.caption,
    color: colors.primary[600],
    fontStyle: 'italic',
    marginTop: 2,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  category: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

export default EventCard;
