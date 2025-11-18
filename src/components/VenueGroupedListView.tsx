import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import EventCard from './EventCard';
import { Text } from './ui';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

const INITIAL_EVENTS_PER_VENUE = 5;

// Helper function to get venue size icon and label with capacity
const getVenueSizeDisplay = (size: string | null): { icon: string; label: string } => {
  if (!size) return { icon: '👥', label: 'CAPACITY N/A' };
  
  const normalizedSize = size.toLowerCase();
  
  if (normalizedSize === 'small' || normalizedSize === 's') {
    return { icon: '', label: '<100 👥' };
  } else if (normalizedSize === 'medium' || normalizedSize === 'm') {
    return { icon: '', label: '100+ 👥' };
  } else if (normalizedSize === 'large' || normalizedSize === 'l') {
    return { icon: '', label: '300+ 👥' };
  }
  
  return { icon: '👥', label: size.toUpperCase() };
};

interface VenueGroupedListViewProps {
  events: Event[];
  loading?: boolean;
  venuesLoading?: boolean;
  onEventPress: (event: Event) => void;
  onVenuePress?: (venue: Venue) => void;
  venues?: Venue[];
}

interface VenueGroup {
  venue: Venue | null;
  events: Event[];
  hasFavorite: boolean;
}

export default function VenueGroupedListView({ 
  events, 
  loading = false,
  venuesLoading = false,
  onEventPress,
  onVenuePress,
  venues = []
}: Readonly<VenueGroupedListViewProps>) {
  const { theme } = useTheme();
  const { favoriteEventIds } = useFavorites();
  const { isMobile } = useDeviceInfo();
  const [expandedVenues, setExpandedVenues] = useState<Set<string>>(new Set());
  
  // Group events by venue and capture initial sort order
  const venueGroups = useMemo(() => {
    const groups = new Map<string, VenueGroup>();

    for (const event of events) {
      const venueId = event.venue_id || 'no-venue';
      const venue = event.venue_id ? venues.find(v => v.id === event.venue_id) || null : null;
      
      if (!groups.has(venueId)) {
        groups.set(venueId, {
          venue,
          events: [],
          hasFavorite: false,
        });
      }

      const group = groups.get(venueId)!;
      group.events.push(event);
      
      // Check if this event is favorited (at the time of grouping)
      if (favoriteEventIds.includes(event.id)) {
        group.hasFavorite = true;
      }
    }

    // Convert to array and sort ONLY when events change
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      // Venues with favorited events first
      if (a.hasFavorite && !b.hasFavorite) return -1;
      if (!a.hasFavorite && b.hasFavorite) return 1;

      // Then alphabetically by venue name
      const nameA = a.venue?.name || 'Unknown Venue';
      const nameB = b.venue?.name || 'Unknown Venue';
      return nameA.localeCompare(nameB);
    });

    return sortedGroups;
  }, [events, venues]); // Remove favoriteEventIds from dependencies!

  // Show loading indicator when:
  // 1. Events are loading and we have no events yet, OR
  // 2. Venues are still loading (wait for them to avoid "Unknown Venue" flash)
  if ((loading && events.length === 0) || venuesLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background.primary }]}>
        <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
          Loading events...
        </Text>
      </View>
    );
  }

  // Show empty state when not loading and no events
  if (!loading && events.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background.primary }]}>
        <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
          No events found
        </Text>
      </View>
    );
  }

  const toggleVenueExpansion = (venueId: string) => {
    setExpandedVenues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(venueId)) {
        newSet.delete(venueId);
      } else {
        newSet.add(venueId);
      }
      return newSet;
    });
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      removeClippedSubviews={true} // Performance optimization
    >
      {venueGroups.map((group, index) => {
        const venueName = group.venue?.name || 'Unknown Venue';
        const venueId = group.venue?.id || `unknown-${index}`;
        const venueSize = group.venue?.venue_size || null;
        const venueType = group.venue?.type || null;
        const isExpanded = expandedVenues.has(venueId);
        const displayEvents = isExpanded ? group.events : group.events.slice(0, INITIAL_EVENTS_PER_VENUE);
        const hasMore = group.events.length > INITIAL_EVENTS_PER_VENUE;
        const sizeDisplay = getVenueSizeDisplay(venueSize);
        
        return (
          <View key={`venue-${venueId}`} style={styles.venueGroup}>
            {/* Venue Header */}
            <TouchableOpacity
              style={[styles.venueHeader, { 
                borderBottomColor: theme.colors.border.light,
              }]}
              onPress={() => group.venue && onVenuePress?.(group.venue)}
              disabled={!group.venue || !onVenuePress}
            >
              <View style={styles.venueHeaderLeft}>
                <Text style={[styles.venueIcon, { color: theme.colors.text.tertiary }]}>📍</Text>
                <Text variant="body2" style={[styles.venueName, { color: theme.colors.text.secondary }]}>
                  {venueName}
                </Text>
              </View>
              
              {/* Venue tags - hide on mobile */}
              {!isMobile && (
                <View style={styles.venueTags}>
                  {venueSize && (
                    <View style={[styles.venueTag, { 
                      backgroundColor: theme.colors.primary[100],
                      borderColor: theme.colors.primary[200],
                    }]}>
                      <Text style={[styles.venueTagIcon, { color: theme.colors.primary[700] }]}>
                        {sizeDisplay.icon}
                      </Text>
                      <Text style={[styles.venueTagText, { color: theme.colors.primary[700] }]}>
                        {sizeDisplay.label}
                      </Text>
                    </View>
                  )}
                  {venueType && (
                    <View style={[styles.venueTag, { 
                      backgroundColor: theme.colors.secondary[100],
                      borderColor: theme.colors.secondary[200],
                    }]}>
                      <Text style={[styles.venueTagText, { color: theme.colors.secondary[700] }]}>
                        {venueType}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Events in this venue - Card container */}
            <View style={[styles.eventsCardContainer, { backgroundColor: theme.colors.background.primary }]}>
              {displayEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={onEventPress}
                  variant="grouped"
                  venues={venues}
                  isMobile={isMobile}
                />
              ))}
              
              {/* Show More/Less Button */}
              {hasMore && (
                <TouchableOpacity
                  style={[styles.showMoreButton, { borderTopColor: theme.colors.border.light }]}
                  onPress={() => toggleVenueExpansion(venueId)}
                >
                  <Text variant="body2" style={{ color: theme.colors.primary[600], fontWeight: '600' }}>
                    {isExpanded ? '▲ Show less' : `▼ Show ${group.events.length - INITIAL_EVENTS_PER_VENUE} more from this venue`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  venueGroup: {
    marginBottom: 32,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  venueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  venueIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  venueTags: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  venueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  venueTagIcon: {
    fontSize: 12,
    lineHeight: 14,
  },
  venueTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventsCardContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  showMoreButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
