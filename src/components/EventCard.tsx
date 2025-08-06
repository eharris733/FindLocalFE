import React from 'react';
import { View, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';
import { useTheme } from '../context/ThemeContext';
import { Text, Card } from './ui';

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
  variant?: 'default' | 'compact';
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

const EventCard: React.FC<EventCardProps> = ({ event, onPress, variant = 'default' }) => {
  const { theme } = useTheme();
  
  const handleCardPress = () => {
    if (onPress) {
      onPress(event);
    } else if (event.detail_page_url) {
      Linking.openURL(event.detail_page_url);
    }
  };

  const imageSource = event.image_url 
    ? { uri: event.image_url }
    : require('../../assets/music.png');

  // Extract first genre from music_info for display
  const getDisplayGenre = () => {
    if (event.music_info && event.music_info.genres) {
      if (Array.isArray(event.music_info.genres)) {
        return event.music_info.genres[0];
      } else if (typeof event.music_info.genres === 'string') {
        return event.music_info.genres;
      }
    }
    return null;
  };

  const displayGenre = getDisplayGenre();

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handleCardPress}>
        <View style={[styles.compactCard, { 
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
        }]}>
          <Image
            source={imageSource}
            style={[styles.compactImage, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />
          
          <View style={styles.compactContent}>
            <Text variant="body1" numberOfLines={2} style={styles.compactTitle}>
              {event.title || 'Untitled Event'}
            </Text>
            
            <Text variant="caption" color="secondary" numberOfLines={1} style={styles.compactVenue}>
              📍 {event.city}
            </Text>
            
            <View style={styles.compactMeta}>
              {event.event_date && (
                <Text variant="caption" style={[styles.compactDate, { color: theme.colors.primary[600] }]}>
                  {format(new Date(event.event_date), 'MMM dd')}
                </Text>
              )}
              {event.start_time && (
                <Text variant="caption" style={[styles.compactTime, { color: theme.colors.secondary[500] }]}>
                  {formatMilitaryTime(event.start_time)}
                </Text>
              )}
              {displayGenre && (
                <View style={[styles.compactCategory, { backgroundColor: theme.colors.accent[500] }]}>
                  <Text variant="caption" color="inverse" style={styles.compactCategoryText}>
                    {displayGenre}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Default variant (existing layout)
  return (
    <TouchableOpacity onPress={handleCardPress}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            source={imageSource}
            style={[styles.image, { backgroundColor: theme.colors.gray[100] }]}
            resizeMode="cover"
          />
          
          <View style={styles.textContent}>
            <Text variant="h5" numberOfLines={2} style={styles.title}>
              {event.title || 'Untitled Event'}
            </Text>
            
            <View style={styles.metaInfo}>
              {event.event_date && (
                <Text 
                  variant="body2" 
                  style={[styles.date, { color: theme.colors.primary[600] }]}
                >
                  {format(new Date(event.event_date), 'MMM dd, yyyy')}
                </Text>
              )}
              {event.start_time && (
                <Text 
                  variant="body2" 
                  style={[styles.time, { color: theme.colors.secondary[500] }]}
                >
                  {formatMilitaryTime(event.start_time)}
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.venueContainer}
              onPress={handleCardPress}
            >
              <Text variant="body2" color="secondary" numberOfLines={1} style={styles.venue}>
                📍 {event.city}
              </Text>
              <Text 
                variant="caption" 
                style={[styles.venueHint, { color: theme.colors.primary[600] }]}
              >
                Tap for event details
              </Text>
            </TouchableOpacity>
            
            {displayGenre && (
              <View style={[styles.categoryContainer, { backgroundColor: theme.colors.accent[500] }]}>
                <Text variant="caption" color="inverse" style={styles.category}>
                  {displayGenre}
                </Text>
              </View>
            )}
            
            {event.description && (
              <Text variant="body2" color="secondary" numberOfLines={2} style={styles.description}>
                {event.description}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Default variant styles
  card: {
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  title: {
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontWeight: '600',
    marginRight: 16,
  },
  time: {
    fontWeight: '600',
  },
  venueContainer: {
    marginBottom: 8,
  },
  venue: {
    fontStyle: 'italic',
  },
  venueHint: {
    fontStyle: 'italic',
    marginTop: 2,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  category: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    lineHeight: 18,
  },
  
  // Compact variant styles
  compactCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  compactVenue: {
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  compactDate: {
    fontWeight: '600',
    marginRight: 8,
  },
  compactTime: {
    fontWeight: '500',
    marginRight: 8,
  },
  compactCategory: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default EventCard;
