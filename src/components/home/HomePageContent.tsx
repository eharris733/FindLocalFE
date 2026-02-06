import React from 'react';
import { Platform } from 'react-native';
import type { Event } from '../../types/events';
import { useAuth } from '../../hooks/useAuth';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';

import {
  AnonymousWebLayout,
  AuthenticatedWebLayout,
  AnonymousAppLayout,
  AuthenticatedAppLayout,
} from './layouts';

interface HomePageContentProps {
  onEventPress: (event: Event) => void;
}

/**
 * HomePageContent orchestrator
 *
 * Renders one of 4 experiences based on:
 * - Platform (web vs native app)
 * - Authentication status (logged in vs anonymous)
 *
 * | Platform | Anonymous | Authenticated |
 * |----------|-----------|---------------|
 * | Web      | AnonymousWebLayout | AuthenticatedWebLayout |
 * | App      | AnonymousAppLayout | AuthenticatedAppLayout |
 */
export const HomePageContent: React.FC<HomePageContentProps> = ({ onEventPress }) => {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isMobile } = useDeviceInfo();

  const isWeb = Platform.OS === 'web';
  const isMobileWeb = isWeb && isMobile;

  // Web experiences
  if (isWeb) {
    if (isLoggedIn) {
      return <AuthenticatedWebLayout onEventPress={onEventPress} />;
    }
    return <AnonymousWebLayout onEventPress={onEventPress} showAppBanner={isMobileWeb} />;
  }

  // Native app experiences
  if (isLoggedIn) {
    return <AuthenticatedAppLayout onEventPress={onEventPress} />;
  }
  return <AnonymousAppLayout onEventPress={onEventPress} />;
};
