import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { Icon, Text, Logo } from './ui';
import MapToggleButton from './MapToggleButton';

const NAV_LINKS: { label: string; path: string }[] = [
  { label: 'Discover', path: '/' },
  { label: 'Map', path: '/?view=map' },
  { label: 'Venues', path: '/venues' },
  { label: 'About', path: '/about' },
];

export default function Header() {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ view?: string }>();

  const onDiscover = pathname === '/' || pathname === '/index';
  const viewMode = params.view === 'map' ? 'map' : 'list';
  const showMapToggle = onDiscover;

  const handleMapToggle = () => {
    router.setParams({ view: viewMode === 'map' ? 'list' : 'map' } as any);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const handleNavLink = (path: string) => {
    router.push(path as any);
  };

  const handleBookmark = () => {
    router.push('/saved');
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
        },
      ]}
    >
      <View style={styles.left}>
        {isDesktop ? (
          <TouchableOpacity onPress={() => router.push('/')} accessibilityRole="link">
            <Logo isMobile />
          </TouchableOpacity>
        ) : showMapToggle ? (
          <MapToggleButton current={viewMode} onToggle={handleMapToggle} />
        ) : (
          <TouchableOpacity
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.iconButton, { borderColor: theme.colors.border.light }]}
          >
            <Icon name="arrow-back" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        {!isDesktop && (
          <TouchableOpacity onPress={() => router.push('/')} accessibilityRole="link">
            <Logo isMobile />
          </TouchableOpacity>
        )}
        {isDesktop && (
          <View style={styles.navLinks}>
            {NAV_LINKS.map((link) => {
              const isActive =
                (link.path === '/' && onDiscover && viewMode === 'list') ||
                (link.path === '/?view=map' && onDiscover && viewMode === 'map') ||
                (link.path !== '/' && link.path !== '/?view=map' && pathname === link.path);
              return (
                <TouchableOpacity
                  key={link.path}
                  onPress={() => handleNavLink(link.path)}
                  accessibilityRole="link"
                  style={styles.navLink}
                >
                  <Text
                    variant="label"
                    style={{
                      color: isActive ? theme.colors.primary[500] : theme.colors.text.secondary,
                      fontWeight: isActive ? '700' : '500',
                    }}
                  >
                    {link.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          onPress={handleBookmark}
          accessibilityRole="link"
          accessibilityLabel="Saved events"
          style={[styles.iconButton, { borderColor: theme.colors.border.light }]}
        >
          <Icon
            name={pathname === '/saved' ? 'bookmark-filled' : 'bookmark'}
            size={20}
            color={theme.colors.primary[500]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 50 } : {}),
  },
  left: {
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  right: {
    minWidth: 80,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginLeft: 32,
  },
  navLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});
