import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

interface TabConfig {
  name: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  requiresAuth?: boolean;
}

const TABS: TabConfig[] = [
  { name: 'Home', route: '/home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Discover', route: '/', icon: 'compass-outline', activeIcon: 'compass' },
  { name: 'Create', route: '/create', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { name: 'Friends', route: '/friends', icon: 'people-outline', activeIcon: 'people' },
  { name: 'Map', route: '/?view=map', icon: 'map-outline', activeIcon: 'map' },
];

export default function BottomTabBar() {
  const { theme } = useTheme();
  const { isMobile, isTablet } = useDeviceInfo();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useLocalSearchParams<{ view?: string }>();
  const insets = useSafeAreaInsets();

  // Track if user navigated via Map tab (for highlighting purposes)
  const [mapTabActive, setMapTabActive] = useState(false);

  // Reset map tab state when navigating away from home
  useEffect(() => {
    if (pathname !== '/' && pathname !== '/index') {
      setMapTabActive(false);
    }
  }, [pathname]);

  // Sync map tab state with URL query param
  useEffect(() => {
    if ((pathname === '/' || pathname === '/index') && searchParams.view === 'map') {
      setMapTabActive(true);
    }
  }, [pathname, searchParams.view]);

  // Only render on native mobile/tablet (iOS/Android), not on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Don't render on desktop
  if (!isMobile && !isTablet) {
    return null;
  }

  const isActiveTab = (route: string) => {
    // Special handling for Map tab
    if (route === '/?view=map') {
      return (pathname === '/' || pathname === '/index') && mapTabActive;
    }
    // Handle Discover tab (only active when on home AND not in map mode)
    if (route === '/') {
      return (pathname === '/' || pathname === '/index') && !mapTabActive;
    }
    // For other routes, check if pathname starts with route
    return pathname.startsWith(route);
  };

  const handlePress = (tab: TabConfig) => {
    if (tab.requiresAuth && !isLoggedIn) {
      router.push('/user/signin');
    } else {
      // Track Map tab presses
      if (tab.route === '/?view=map') {
        setMapTabActive(true);
      } else if (tab.route === '/') {
        setMapTabActive(false);
      }
      router.push(tab.route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.primary,
          borderTopColor: theme.colors.border.light,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = isActiveTab(tab.route);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handlePress(tab)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? theme.colors.primary[500] : theme.colors.text.tertiary}
            />
            <Text
              variant="caption"
              style={{
                color: isActive ? theme.colors.primary[500] : theme.colors.text.tertiary,
                marginTop: 4,
                fontSize: 11,
              }}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
