import React from 'react';
import { View, FlatList, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import EventCard from './EventCard';
import { Text } from './ui';
import type { Event } from '../types/events';

interface SidebarEventListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onEventHover?: (event: Event | null) => void;
  highlightedEventId?: string;
}

export default function SidebarEventList({ 
  events, 
  onEventPress, 
  onEventHover,
  highlightedEventId 
}: SidebarEventListProps) {
  const { theme } = useTheme();

  const renderEventCard = ({ item }: { item: Event }) => (
    <View
      style={[
        styles.eventCardContainer,
        highlightedEventId === item.id && { 
          backgroundColor: theme.colors.primary[50],
          borderLeftColor: theme.colors.primary[500],
          borderLeftWidth: 4,
        }
      ]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => onEventHover?.(item),
        onMouseLeave: () => onEventHover?.(null),
      })}
    >
      <EventCard 
        event={item} 
        onPress={onEventPress}
        variant="compact"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
        <Text variant="h3" color="primary" style={styles.headerTitle}>
          Events Near You
        </Text>
        <Text variant="body2" color="secondary">
          {events.length} events found
        </Text>
      </View>
      
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    marginBottom: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  eventCardContainer: {
    marginBottom: 2,
    transition: Platform.OS === 'web' ? 'all 0.2s ease' : undefined,
  },
});