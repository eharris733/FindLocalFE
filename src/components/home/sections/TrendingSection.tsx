import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList } from '../shared';
import { useTheme } from '../../../context/ThemeContext';

interface TrendingSectionProps {
  title: string;
  emoji?: string;
  events: Event[];
  loading?: boolean;
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

export const TrendingSection: React.FC<TrendingSectionProps> = ({
  title,
  emoji,
  events,
  loading = false,
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();

  // Don't render if no events and not loading
  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title={title}
        emoji={emoji}
        onSeeAll={onSeeAll}
        count={events.length}
      />
      <HorizontalEventList
        events={events}
        onEventPress={onEventPress}
        loading={loading}
        emptyMessage={`No ${title.toLowerCase()} events right now`}
        venues={venues}
        communities={communities}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
});
