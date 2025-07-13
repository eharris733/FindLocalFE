import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import MapViewComponent from './MapViewComponent';
import EventBottomSheet from './EventBottomSheet';
import type { Event } from '../types/events';

interface MapPanelProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  highlightedEventId?: string;
  onMarkerPress?: (event: Event) => void;
}

export default function MapPanel({ 
  events, 
  onEventPress, 
  highlightedEventId,
  onMarkerPress 
}: MapPanelProps) {
  const { theme } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const handleMarkerPress = (event: Event) => {
    setSelectedEvent(event);
    setShowBottomSheet(true);
    onMarkerPress?.(event);
  };

  const handleBottomSheetEventPress = (event: Event) => {
    setShowBottomSheet(false);
    setSelectedEvent(null);
    onEventPress(event);
  };

  const handleCloseBottomSheet = () => {
    setShowBottomSheet(false);
    setSelectedEvent(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <MapViewComponent 
        events={events}
        onEventPress={handleMarkerPress}
        highlightedEventId={highlightedEventId}
      />
      
      {/* Event Bottom Sheet / Tooltip */}
      <EventBottomSheet
        visible={showBottomSheet}
        event={selectedEvent}
        onEventPress={handleBottomSheetEventPress}
        onClose={handleCloseBottomSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});