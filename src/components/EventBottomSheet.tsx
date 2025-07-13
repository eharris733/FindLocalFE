import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';

interface EventBottomSheetProps {
  visible: boolean;
  event: Event | null;
  onEventPress?: (event: Event) => void; // Make this optional
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

const EventBottomSheet: React.FC<EventBottomSheetProps> = ({ visible, event, onEventPress, onClose }) => {
  const { theme } = useTheme();

  if (!visible || !event) return null;

  const handleEventPress = () => {
    if (onEventPress) {
      onEventPress(event);
    } else if (event.url) {
      Linking.openURL(event.url);
    }
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <View style={[styles.bottomSheet, {
        backgroundColor: theme.colors.background.primary,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        ...theme.shadows.large,
      }]}>
        <View style={[styles.handle, {
          backgroundColor: theme.colors.gray[300],
          marginTop: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        }]} />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={{ 
                uri: event.preview_image || 'https://via.placeholder.com/300x200/63BAAB/FFFFFF?text=Event' 
              }}
              style={[styles.image, { backgroundColor: theme.colors.gray[100] }]}
              resizeMode="cover"
            />
            
            <TouchableOpacity 
              style={[styles.closeButton, {
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.borderRadius.full,
                ...theme.shadows.small,
                top: theme.spacing.md,
                right: theme.spacing.md,
              }]} 
              onPress={onClose}
            >
              <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.details, { padding: theme.spacing.md }]}>
            <Text variant="h2" style={[styles.title, { 
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md,
            }]}>
              {event.title}
            </Text>
            
            <View style={[styles.metaRow, { marginBottom: theme.spacing.md }]}>
              <View style={[styles.metaItem, { marginRight: theme.spacing.sm }]}>
                <Text variant="caption" style={{
                  color: theme.colors.text.tertiary,
                  textTransform: 'uppercase',
                  marginBottom: theme.spacing.xs,
                }}>
                  📅 Date
                </Text>
                <Text variant="body2" style={{
                  color: theme.colors.primary[600],
                  fontWeight: '600',
                }}>
                  {format(new Date(event.event_date), 'EEEE, MMM dd, yyyy')}
                </Text>
              </View>
              
              {event.time && (
                <View style={styles.metaItem}>
                  <Text variant="caption" style={{
                    color: theme.colors.text.tertiary,
                    textTransform: 'uppercase',
                    marginBottom: theme.spacing.xs,
                  }}>
                    🕐 Time
                  </Text>
                  <Text variant="body2" style={{
                    color: theme.colors.primary[600],
                    fontWeight: '600',
                  }}>
                    {formatMilitaryTime(event.time)}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.venueContainer, { marginBottom: theme.spacing.md }]}>
              <Text variant="caption" style={{
                color: theme.colors.text.tertiary,
                textTransform: 'uppercase',
                marginBottom: theme.spacing.xs,
              }}>
                📍 Venue
              </Text>
              <Text variant="body1" style={{
                color: theme.colors.text.secondary,
                fontStyle: 'italic',
              }}>
                {event.venue_name}
              </Text>
            </View>

            {event.category && (
              <View style={[styles.categoryContainer, {
                backgroundColor: theme.colors.accent[500],
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.full,
                marginBottom: theme.spacing.md,
              }]}>
                <Text variant="caption" style={{
                  color: theme.colors.text.inverse,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}>
                  {event.category}
                </Text>
              </View>
            )}

            {event.description && (
              <View style={[styles.descriptionContainer, { marginBottom: theme.spacing.xl }]}>
                <Text variant="h4" style={{
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.sm,
                }}>
                  About this event
                </Text>
                <Text variant="body1" style={{
                  color: theme.colors.text.secondary,
                  lineHeight: 24,
                }}>
                  {event.description}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, {
                backgroundColor: theme.colors.secondary[500],
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.borderRadius.lg,
                marginBottom: theme.spacing.lg,
                ...theme.shadows.small,
              }]}
              onPress={handleEventPress}
              disabled={!event.url}
            >
              <Text variant="button" style={{ color: theme.colors.text.inverse }}>
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
    maxHeight: height * 0.75,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
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
  },
  closeButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {},
  title: {},
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  venueContainer: {},
  categoryContainer: {
    alignSelf: 'flex-start',
  },
  descriptionContainer: {},
  actionButton: {
    alignItems: 'center',
  },
});

export default EventBottomSheet;
