import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
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
  { name: 'Profile', route: '/(private)/profile', icon: 'person-outline', activeIcon: 'person', requiresAuth: true },
];

export default function BottomTabBar() {
  const { theme } = useTheme();
  const { isMobile, isTablet } = useDeviceInfo();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Only render on native mobile/tablet (iOS/Android), not on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Don't render on desktop
  if (!isMobile && !isTablet) {
    return null;
  }

  const isActiveTab = (route: string) => {
    // Handle root/index route
    if (route === '/') {
      return pathname === '/' || pathname === '/index';
    }
    // For other routes, check if pathname starts with route
    return pathname.startsWith(route);
  };

  const handlePress = (tab: TabConfig) => {
    if (tab.requiresAuth && !isLoggedIn) {
      router.push('/user/signin');
    } else {
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
