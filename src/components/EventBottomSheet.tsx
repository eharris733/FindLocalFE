import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface EventBottomSheetProps {
  event: Event | null;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

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

const EventBottomSheet: React.FC<EventBottomSheetProps> = ({ event, onClose }) => {
  if (!event) return null;

  const handleEventPress = () => {
    if (event.url) {
      Linking.openURL(event.url);
    }
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={{ 
                uri: event.preview_image || 'https://via.placeholder.com/300x200/63BAAB/FFFFFF?text=Event' 
              }}
              style={styles.image}
              resizeMode="cover"
            />
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.details}>
            <Text style={styles.title}>{event.title}</Text>
            
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>📅 Date</Text>
                <Text style={styles.metaValue}>
                  {format(new Date(event.event_date), 'EEEE, MMM dd, yyyy')}
                </Text>
              </View>
              
              {event.time && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>🕐 Time</Text>
                  <Text style={styles.metaValue}>
                    {formatMilitaryTime(event.time)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.venueContainer}>
              <Text style={styles.metaLabel}>📍 Venue</Text>
              <Text style={styles.venue}>{event.venue_name}</Text>
            </View>

            {event.category && (
              <View style={styles.categoryContainer}>
                <Text style={styles.category}>{event.category}</Text>
              </View>
            )}

            {event.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>About this event</Text>
                <Text style={styles.description}>{event.description}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEventPress}
              disabled={!event.url}
            >
              <Text style={styles.actionButtonText}>
                {event.url ? '🎫 View Event Details' : 'No Link Available'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: height * 0.75,
    ...shadows.large,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.gray[100],
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  closeButtonText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  details: {
    padding: spacing.md,
  },
  title: {
    ...typography.heading2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metaItem: {
    flex: 1,
    marginRight: spacing.sm,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  metaValue: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  venueContainer: {
    marginBottom: spacing.md,
  },
  venue: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  category: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  descriptionContainer: {
    marginBottom: spacing.xl,
  },
  descriptionLabel: {
    ...typography.heading4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: colors.secondary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});

export default EventBottomSheet;
