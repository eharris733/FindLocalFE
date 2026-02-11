import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { Event } from '../../../types/events';
import type { Community } from '../../../api/communities';
import { useTheme } from '../../../context/ThemeContext';
import { useCityLocation } from '../../../context/CityContext';
import { usePopularEventsQuery } from '../../../hooks/queries/useTrendingEventsQuery';
import { useCommunitiesQuery } from '../../../hooks/queries/useCommunitiesQuery';
import { useVenuesQuery } from '../../../hooks/queries/useVenuesQuery';
import { useRouter } from 'expo-router';

import {
  HeroSection,
  TrendingSection,
  CommunityBrowseSection,
  SignupValueCard,
} from '../sections';
import FooterDisclaimer from '../../FooterDisclaimer';

interface AnonymousAppLayoutProps {
  onEventPress: (event: Event) => void;
}

export const AnonymousAppLayout: React.FC<AnonymousAppLayoutProps> = ({
  onEventPress,
}) => {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const router = useRouter();
  const [showSignup, setShowSignup] = useState(true);

  const { data: popularEvents, isLoading: loadingEvents } = usePopularEventsQuery(selectedCity, 15);
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

  const handleSkipSignup = () => {
    setShowSignup(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <HeroSection simplified />

      <TrendingSection
        title="Popular This Week"
        emoji="🔥"
        events={popularEvents || []}
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

      {showSignup && <SignupValueCard onSkip={handleSkipSignup} />}

      <FooterDisclaimer />

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
