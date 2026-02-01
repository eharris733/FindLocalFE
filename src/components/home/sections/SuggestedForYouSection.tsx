import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { SectionHeader, HorizontalEventList } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import { useCityLocation } from '../../../context/CityContext';
import { useSuggestedEventsQuery } from '../../../hooks/queries/useSuggestedEventsQuery';

interface SuggestedForYouSectionProps {
  onEventPress: (event: Event) => void;
  onSeeAll?: () => void;
  venues?: Venue[];
  communities?: Community[];
}

export const SuggestedForYouSection: React.FC<SuggestedForYouSectionProps> = ({
  onEventPress,
  onSeeAll,
  venues,
  communities,
}) => {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const { data: suggestedEvents, isLoading } = useSuggestedEventsQuery(selectedCity, 15);

  // Don't render if no suggestions
  if (!isLoading && (!suggestedEvents || suggestedEvents.length === 0)) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader
        title="Suggested for You"
        emoji="✨"
        onSeeAll={onSeeAll}
        count={suggestedEvents?.length}
      />
      <HorizontalEventList
        events={suggestedEvents || []}
        onEventPress={onEventPress}
        loading={isLoading}
        emptyMessage="No suggestions yet"
        emptyIcon="✨"
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
