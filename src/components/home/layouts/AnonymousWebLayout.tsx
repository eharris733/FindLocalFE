import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Venue } from '../../../types/venues';
import type { Community } from '../../../api/communities';
import { useTheme } from '../../../context/ThemeContext';
import { useCityLocation } from '../../../context/CityContext';
import { useDeviceInfo } from '../../../hooks/useDeviceInfo';
import { usePopularEventsQuery } from '../../../hooks/queries/useTrendingEventsQuery';
import { useCommunitiesQuery } from '../../../hooks/queries/useCommunitiesQuery';
import { useVenuesQuery } from '../../../hooks/queries/useVenuesQuery';
import { useRouter } from 'expo-router';

import {
  HeroSection,
  TrendingSection,
  CommunityBrowseSection,
  SignupCtaBanner,
  GetAppBanner,
} from '../sections';

interface AnonymousWebLayoutProps {
  onEventPress: (event: Event) => void;
  showAppBanner?: boolean;
}

export const AnonymousWebLayout: React.FC<AnonymousWebLayoutProps> = ({
  onEventPress,
  showAppBanner = false,
}) => {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const { isMobile } = useDeviceInfo();
  const router = useRouter();

  const { data: popularEvents, isLoading: loadingEvents } = usePopularEventsQuery(selectedCity, 20);
  const { data: communities, isLoading: loadingCommunities } = useCommunitiesQuery(selectedCity);
  const { data: venues } = useVenuesQuery(selectedCity);

  const handleCommunityPress = (community: Community) => {
    router.push({
      pathname: '/',
      params: { communityId: community.id },
    });
  };

  const handleSeeAllEvents = () => {
    router.push('/');
  };

  // Split popular events into "sections" for display
  const section1Events = popularEvents?.slice(0, 6) || [];
  const section2Events = popularEvents?.slice(6, 12) || [];
  const section3Events = popularEvents?.slice(12, 18) || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {showAppBanner && <GetAppBanner />}

      <HeroSection />

      <TrendingSection
        title="Popular This Week"
        emoji="🔥"
        events={section1Events}
        loading={loadingEvents}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllEvents}
        venues={venues}
        communities={communities}
      />

      <TrendingSection
        title="Happening Soon"
        emoji="⚡"
        events={section2Events}
        loading={loadingEvents}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllEvents}
        venues={venues}
        communities={communities}
      />

      <CommunityBrowseSection
        communities={communities || []}
        onCommunityPress={handleCommunityPress}
        loading={loadingCommunities}
      />

      <TrendingSection
        title="More to Explore"
        emoji="🎭"
        events={section3Events}
        loading={loadingEvents}
        onEventPress={onEventPress}
        onSeeAll={handleSeeAllEvents}
        venues={venues}
        communities={communities}
      />

      <SignupCtaBanner />

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
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 100,
  },
});
