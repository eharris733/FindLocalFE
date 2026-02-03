import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import { CityPicker } from './ui/CityPicker';
import { CommunityPicker } from './ui/CommunityPicker';
import {useDeviceInfo} from "../hooks/useDeviceInfo";
import {Logo} from "./ui/Logo";
import { useAuth } from '../hooks/useAuth';
import { useCityLocation } from '../context/CityContext';
import { useCommunity } from '../context/CommunityContext';
import { useRouter } from 'expo-router';

interface TopNavigationProps {
  readonly onNavLinkPress?: (link: string) => void;
}

export default function TopNavigation({ onNavLinkPress }: TopNavigationProps) {
  const { theme } = useTheme();
  const { isMobile, isTablet } = useDeviceInfo();
  const { isLoggedIn, profile } = useAuth();

  // Check if user is a creator
  const isCreator = profile?.account_type === 'creator';

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.username) {
      return profile.username[0].toUpperCase();
    }
    return '?';
  };

  // Avatar color - use primary to match profile page
  const avatarColor = theme.colors.primary[500];

  // Use collapsed nav for mobile AND tablet to prevent overflow
  // Show full nav only on desktop (>= 1024px)
  const useCollapsedNav = isMobile || isTablet;
  const { selectedCity, onCityChange, selectedRegions, onRegionsChange } = useCityLocation();
  const { selectedCommunities } = useCommunity();
  const router = useRouter();
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);

  const navLinks = ['Events', 'About', 'Friends'];

  const formatCommunityName = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'theater') return 'Theater';
    if (lower === 'culture') return 'Culture';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const handleProfilePress = () => {
    if (isLoggedIn) {
      router.push('/(private)/profile');
    } else {
      router.push('/user/signin');
    }
  };

  const handleNavLinkPress = (link: string) => {
    onNavLinkPress?.(link);
  };

  const handleCityPickerOpen = () => {
    setShowCityPicker(true);
  };

  const handleCityChange = async (city: string) => {
    await onCityChange(city);
    // Modal will close itself and call handleCityPickerClose via onClose
  };

  const handleCityPickerClose = () => {
    setShowCityPicker(false);
  };

  return (
    <>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background.primary }}>
        <View style={[
            styles.container,
            useCollapsedNav ? styles.condensed : styles.roomy,
          {
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
          ...theme.shadows.small,
        }]}>
          <View style={styles.content}>
          {/* Left section - Mobile city picker + Desktop city/community badges */}
          <View style={styles.leftSection}>
            {useCollapsedNav ? (
              <TouchableOpacity
                style={[styles.mobileCityButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={handleCityPickerOpen}
              >
                <Text variant="body2" color="primary" style={styles.mobileCityText} numberOfLines={1}>
                  {selectedCity}
                </Text>
                <Text variant="caption" color="secondary" style={styles.cityArrow}>▼</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.badgeContainer}>
                <TouchableOpacity
                  style={[styles.communityBadge, { 
                    backgroundColor: theme.colors.primary[100],
                    borderColor: theme.colors.primary[300],
                  }]}
                  onPress={() => setShowCommunityPicker(true)}
                >
                  <Text variant="body2" color="primary" style={styles.communitiesText}>
                    {selectedCommunities.length === 0 ? '🌍 Everything' : selectedCommunities.map(formatCommunityName).join(' • ')}
                  </Text>
                  <Text variant="caption" color="primary" style={styles.cityArrow}>▼</Text>
                </TouchableOpacity>
                
                <Text variant="body2" color="secondary" style={styles.inText}>in</Text>
                
                <TouchableOpacity
                  style={[styles.cityBadge, { 
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.light,
                  }]}
                  onPress={handleCityPickerOpen}
                >
                  <Text variant="body2" color="primary" style={styles.cityText}>
                    {selectedCity}
                  </Text>
                  <Text variant="caption" color="secondary" style={styles.cityArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.centerSection}>
            <Pressable onPress={() => handleNavLinkPress('')}>
              <Logo isMobile={useCollapsedNav}/>
            </Pressable>
          </View>
          
          {/* Right section with nav links and profile */}
          <View style={styles.rightSection}>
            {!useCollapsedNav && (
              <View style={styles.navLinks}>
                {navLinks.map((link) => (
                  <TouchableOpacity
                    key={link}
                    style={styles.navLink}
                    onPress={() => onNavLinkPress?.(link)}
                  >
                    <Text variant="body2" color="secondary" style={styles.navLinkText}>
                      {link}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Social links for logged-in users on desktop */}
                {isLoggedIn && (
                  <>
                    <TouchableOpacity
                      style={styles.navLink}
                      onPress={() => router.push('/discover-creators')}
                    >
                      <Text variant="body2" color="secondary" style={styles.navLinkText}>
                        Creators
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.navLink}
                      onPress={() => router.push('/following-activity')}
                    >
                      <Text variant="body2" color="secondary" style={styles.navLinkText}>
                        Following
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            
            {useCollapsedNav ? (
              <TouchableOpacity
                style={[styles.mobileProfileButton, {
                  backgroundColor: isLoggedIn ? avatarColor : theme.colors.background.secondary,
                }]}
                onPress={handleProfilePress}
              >
                {isLoggedIn ? (
                  <Text style={styles.avatarInitials}>
                    {getUserInitials()}
                  </Text>
                ) : (
                  <Ionicons
                    name="person-circle-outline"
                    size={28}
                    color={theme.colors.text.primary}
                  />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.profileButton, {
                  backgroundColor: isCreator ? theme.colors.secondary[500] : theme.colors.background.secondary,
                }]}
                onPress={handleProfilePress}
              >
                {isCreator && (
                  <Text variant="caption" style={{ color: '#fff', marginRight: 4, fontWeight: '700' }}>
                    ★
                  </Text>
                )}
                <Text variant="body2" style={[styles.profileText, { color: isCreator ? '#fff' : theme.colors.text.primary }]}>
                  {isLoggedIn ? (isCreator ? 'Creator' : 'Account') : 'Sign In'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      </SafeAreaView>

      {/* City Picker Modal - Available to all users */}
      {showCityPicker && (
        <CityPicker
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
          selectedRegions={selectedRegions}
          onRegionsChange={onRegionsChange}
          onClose={handleCityPickerClose}
          initiallyOpen={true}
          showTrigger={false}
        />
      )}

      {/* Community Picker Modal */}
      {showCommunityPicker && (
        <CommunityPicker
          initiallyOpen={true}
          showTrigger={false}
          onClose={() => setShowCommunityPicker(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  roomy: {
    paddingVertical: 8,
  },
  condensed: {
    paddingVertical: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  navLinks: {
    flexDirection: 'row',
    marginRight: 16,
  },
  navLink: {
    marginHorizontal: 12,
    paddingVertical: 8,
  },
  navLinkText: {
    fontWeight: '500',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileText: {
    fontWeight: '600',
  },
  // Mobile City Picker Button
  mobileCityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    maxWidth: 220,
  },
  mobileCityText: {
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  // Mobile Profile Button
  mobileProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Desktop City Badge Styles
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  communitiesText: {
    fontWeight: '600',
    fontSize: 13,
  },
  cityText: {
    fontWeight: '600',
    fontSize: 12,
  },
  cityArrow: {
    fontSize: 11,
    fontWeight: '600',
  },
});