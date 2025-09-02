import React from 'react';
import { View, FlatList, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import EventCard from './EventCard';
import { Text } from './ui';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

interface SidebarEventListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onEventHover?: (event: Event | null) => void;
  highlightedEventId?: string;
  venues?: Venue[];
}

export default function SidebarEventList({ 
  events, 
  onEventPress, 
  onEventHover,
  highlightedEventId,
  venues
}: SidebarEventListProps) {
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');
  
  // Calculate number of columns based on screen width
  const getNumColumns = () => {
    if (width < 768) return 1; // Mobile: 1 column
    if (width < 1200) return 2; // Tablet: 2 columns  
    return 3; // Desktop: 3 columns
  };

  const numColumns = getNumColumns();

  const renderEventCard = ({ item }: { item: Event }) => (
    <View
      style={[
        styles.eventCardWrapper,
        { 
          width: numColumns === 1 ? '100%' : `${100 / numColumns - 2}%`,
          marginHorizontal: numColumns === 1 ? 0 : '1%',
        },
        highlightedEventId === item.id && { 
          backgroundColor: theme.colors.primary[50],
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
        variant="default"
        venues={venues}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        style={styles.list}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  eventCardWrapper: {
    flex: 1,
    margin: 8,
    maxWidth: '100%',
  },
});