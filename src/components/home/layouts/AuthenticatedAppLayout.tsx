import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Community } from '../../../api/communities';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useCityLocation } from '../../../context/CityContext';
import { useAuth } from '../../../hooks/useAuth';
import { useEventsQuery } from '../../../hooks/queries/useEventsQuery';
import { useCommunitiesQuery } from '../../../hooks/queries/useCommunitiesQuery';
import { useVenuesQuery } from '../../../hooks/queries/useVenuesQuery';
import { useUserRsvpsQuery } from '../../../hooks/queries/useUserRsvpsQuery';
import { useRouter } from 'expo-router';

import {
  SocialNotificationBar,
  YourEventsSection,
  YourRsvpsSection,
  InvitedByFriendsSection,
  FromYourNetworkSection,
  FavoritesSection,
  SuggestedForYouSection,
  CommunityBrowseSection,
} from '../sections';

interface AuthenticatedAppLayoutProps {
  onEventPress: (event: Event) => void;
}

export const AuthenticatedAppLayout: React.FC<AuthenticatedAppLayoutProps> = ({
  onEventPress,
}) => {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const { profile } = useAuth();
  const router = useRouter();

  const { data: events, isLoading: loadingEvents } = useEventsQuery(selectedCity);
  const { data: communities, isLoading: loadingCommunities } = useCommunitiesQuery(selectedCity);
  const { data: venues } = useVenuesQuery(selectedCity);
  const { data: rsvps } = useUserRsvpsQuery();

  // Check if user has upcoming plans
  const hasUpcomingPlans = useMemo(() => {
    if (!rsvps || rsvps.length === 0 || !events) return false;
    const today = new Date().toISOString().split('T')[0];
    const eventIdsSet = new Set(rsvps.map(r => r.event_id));
    return events.some(e => eventIdsSet.has(e.id) && e.event_date && e.event_date >= today);
  }, [events, rsvps]);

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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {firstName && (
        <View style={styles.greeting}>
          <Text variant="h2" style={{ color: theme.colors.text.primary }}>
            {getGreeting()}, {firstName}
          </Text>
        </View>
      )}

      <SocialNotificationBar />

      <YourEventsSection
        events={events || []}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllRsvps}
        venues={venues}
        communities={communities}
      />

      {/* Show Your Plans prominently only when user has upcoming plans */}
      {hasUpcomingPlans && (
        <YourRsvpsSection
          events={events || []}
          onEventPress={onEventPress}
          onSeeAll={handleSeeAllRsvps}
          venues={venues}
          communities={communities}
        />
      )}

      <InvitedByFriendsSection
        events={events || []}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllRsvps}
        venues={venues}
        communities={communities}
      />

      <FromYourNetworkSection
        events={events || []}
        onEventPress={onEventPress}
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

      {/* Show Your Plans at bottom when user has no upcoming plans */}
      {!hasUpcomingPlans && (
        <YourRsvpsSection
          events={events || []}
          onEventPress={onEventPress}
          onSeeAll={handleSeeAllRsvps}
          venues={venues}
          communities={communities}
        />
      )}

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
    paddingBottom: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});
