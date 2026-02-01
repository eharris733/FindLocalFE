import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { useTheme } from '../../../context/ThemeContext';
import { useCityLocation } from '../../../context/CityContext';
import { useEventsQuery } from '../../../hooks/queries/useEventsQuery';
import { useCommunitiesQuery } from '../../../hooks/queries/useCommunitiesQuery';
import { useVenuesQuery } from '../../../hooks/queries/useVenuesQuery';
import { useRouter } from 'expo-router';

import {
  SocialNotificationBar,
  YourEventsSection,
  YourRsvpsSection,
  InvitedByFriendsSection,
  FavoritesSection,
  SuggestedForYouSection,
  CommunityBrowseSection,
} from '../sections';

interface AuthenticatedWebLayoutProps {
  onEventPress: (event: Event) => void;
}

export const AuthenticatedWebLayout: React.FC<AuthenticatedWebLayoutProps> = ({
  onEventPress,
}) => {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const router = useRouter();

  const { data: events, isLoading: loadingEvents } = useEventsQuery(selectedCity);
  const { data: communities, isLoading: loadingCommunities } = useCommunitiesQuery(selectedCity);
  const { data: venues } = useVenuesQuery(selectedCity);

  const handleCommunityPress = (community: Community) => {
    router.push({
      pathname: '/',
      params: { communityId: community.id },
    });
  };

  const handleSeeAllRsvps = () => {
    router.push('/(private)/my-invites');
  };

  const handleSeeAllFavorites = () => {
    router.push({
      pathname: '/',
      params: { filter: 'favorites' },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.greeting}>
        {/* Greeting could be added here if we have user profile data */}
      </View>

      <SocialNotificationBar />

      <YourEventsSection
        events={events || []}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllRsvps}
        venues={venues}
        communities={communities}
      />

      <YourRsvpsSection
        events={events || []}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllRsvps}
        venues={venues}
        communities={communities}
      />

      <InvitedByFriendsSection
        events={events || []}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllRsvps}
        venues={venues}
        communities={communities}
      />

      <FavoritesSection
        events={events || []}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllFavorites}
        venues={venues}
        communities={communities}
      />

      <CommunityBrowseSection
        communities={communities || []}
        onCommunityPress={handleCommunityPress}
        loading={loadingCommunities}
      />

      <SuggestedForYouSection
        onEventPress={onEventPress}
        venues={venues}
        communities={communities}
      />

      {/* Bottom spacing for tab bar */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: {
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});
