import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, TextInput } from 'react-native';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useFavorites } from '../context/FavoritesContext';
import { useFilters } from '../context/FiltersContext';
import { Icon, Text, Logo } from './ui';
import MapToggleButton from './MapToggleButton';

const NAV_LINKS: { label: string; path: string }[] = [
  { label: 'Discover', path: '/' },
  { label: 'Map', path: '/?view=map' },
  { label: 'Venues', path: '/venues' },
  { label: 'Blog', path: '/blog' },
  { label: 'About', path: '/about' },
];

// Static HTML sections served outside the SPA (build-time pages / Pages
// Functions). router.push would dead-end in the expo-router route table, so
// these need a full page load.
const EXTERNAL_PATHS = new Set(['/blog', '/platform']);

export default function Header() {
  const { theme } = useTheme();
  const { isDesktop } = useDeviceInfo();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ view?: string }>();
  const { filters, dispatch } = useFilters();
  const searchQuery = filters.query ?? '';
  const { favoriteEventIds } = useFavorites();
  const savedCount = favoriteEventIds.length;
  const savedBadgeLabel = savedCount > 9 ? '9+' : String(savedCount);

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
    if (EXTERNAL_PATHS.has(path)) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(path);
      }
      return;
    }
    router.push(path as any);
  };

  const handleBookmark = () => {
    router.push('/saved');
  };

  const handleSearchChange = (text: string) => {
    dispatch({ type: 'SET_QUERY', payload: text });
  };

  // The query only filters the Discover feed, so Enter from another page
  // takes you there to see the results.
  const handleSearchSubmit = () => {
    if (!onDiscover) router.push('/');
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
          <>
            <TouchableOpacity onPress={() => router.push('/')} accessibilityRole="link">
              <Logo isMobile />
            </TouchableOpacity>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.colors.surface.accent,
                  borderColor: theme.colors.border.light,
                },
              ]}
            >
              <Icon name="search" size={16} color={theme.colors.text.tertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearchChange}
                onSubmitEditing={handleSearchSubmit}
                placeholder="Search events"
                placeholderTextColor={theme.colors.text.tertiary}
                accessibilityLabel="Search events"
                returnKeyType="search"
                style={[
                  styles.searchInput,
                  { color: theme.colors.text.primary },
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleSearchChange('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Icon name="close" size={16} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
          </>
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
          accessibilityLabel={
            savedCount > 0 ? `Saved events, ${savedCount} saved` : 'Saved events'
          }
          style={[styles.iconButton, { borderColor: theme.colors.border.light }]}
        >
          <Icon
            name={pathname === '/saved' ? 'bookmark-filled' : 'bookmark'}
            size={20}
            color={theme.colors.primary[500]}
          />
          {savedCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.primary[500],
                  borderColor: theme.colors.background.primary,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: theme.colors.text.inverse,
                  fontSize: 10,
                  fontWeight: '700',
                  lineHeight: 12,
                }}
              >
                {savedBadgeLabel}
              </Text>
            </View>
          )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    width: 240,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginLeft: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9999,
    borderWidth: 2,
    paddingHorizontal: 4,
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
