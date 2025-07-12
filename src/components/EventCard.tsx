import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { Event } from '../types/events';

interface EventCardProps {
  event: Event;
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

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const handleCardPress = () => {
    if (event.url) {
      Linking.openURL(event.url);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} disabled={!event.url}>
      <View style={styles.cardContent}>
        <Image
          source={{ uri: event.preview_image || 'https://via.placeholder.com/150' }}
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
          
          <Text style={styles.venue} numberOfLines={1}>
            {event.venue_name}
          </Text>
          
          {event.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.category}>{event.category}</Text>
            </View>
          )}
          
          {event.description && (
            <Text style={styles.description} numberOfLines={3}>
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
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  venue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#006B5E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default EventCard;
