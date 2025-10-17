import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import ProfileModal from './ProfileModal';
import { CityPicker } from './ui/CityPicker';
import {useDeviceInfo} from "../hooks/useDeviceInfo";
import {Logo} from "./ui/Logo";
import { useAuth } from '../hooks/useAuth';
import { useCityLocation } from '../context/CityContext';
import { useRouter } from 'expo-router';

interface TopNavigationProps {
  onNavLinkPress?: (link: string) => void;
}

export default function TopNavigation({ onNavLinkPress }: TopNavigationProps) {
  const { theme } = useTheme();
  const {isMobile} = useDeviceInfo();
  const { isLoggedIn } = useAuth();
  const { displayCity, selectedCity, onCityChange } = useCityLocation();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250)); // Start off-screen

  const navLinks = ['About', 'Friends'];

  useEffect(() => {
    if (showMobileMenu) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -250,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showMobileMenu, slideAnim]);

  const handleProfilePress = () => {
    if (isLoggedIn) {
      setShowProfileModal(true);
    } else {
      router.push('/user/signin');
    }
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleMobileMenuPress = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const handleNavLinkPress = (link: string) => {
    onNavLinkPress?.(link);
    setShowMobileMenu(false); // Close menu after selection
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  const handleCityPickerOpen = () => {
    setShowCityPicker(true);
  };

  const handleCityChange = (city: string) => {
    onCityChange(city);
    // Modal will close itself and call handleCityPickerClose via onClose
  };

  const handleCityPickerClose = () => {
    setShowCityPicker(false);
  };

  return (
    <>
      <View style={[
          styles.container,
          isMobile ? styles.condensed : styles.roomy,
        {
        backgroundColor: theme.colors.background.primary,
        borderBottomColor: theme.colors.border.light,
        ...theme.shadows.small,
      }]}>
        <View style={styles.content}>
          {/* Left section - Mobile menu button + Desktop city badge */}
          <View style={styles.leftSection}>
            {isMobile ? (
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={handleMobileMenuPress}
              >
                <Text variant="body1" color="primary" style={styles.menuIcon}>
                  {showMobileMenu ? '✕' : '☰'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.cityBadge, { 
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.light,
                }]}
                onPress={handleCityPickerOpen}
              >
                <Ionicons name="location-outline" size={16} color={theme.colors.primary[600]} />
                <Text variant="body2" color="primary" style={styles.cityText}>
                  {displayCity}
                </Text>
                <Text variant="caption" color="secondary" style={styles.cityArrow}>▼</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.centerSection}>
            <Pressable onPress={() => handleNavLinkPress('')}> <Logo isMobile={isMobile}/></Pressable>
          </View>
          
          {/* Right section with nav links and profile */}
          <View style={styles.rightSection}>
            {!isMobile && (
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
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: theme.colors.background.secondary }]}
              onPress={handleProfilePress}
            >
              <Text variant="body2" color="primary" style={styles.profileText}>
                {isLoggedIn ? 'Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Mobile Side Modal */}
      {isMobile && (
        <Modal
          visible={showMobileMenu}
          transparent={true}
          animationType="none"
          onRequestClose={closeMobileMenu}
        >
          <View style={styles.modalOverlay}>
            {/* Side menu */}
            <Animated.View 
              style={[
                styles.sideMenu,
                {
                  backgroundColor: theme.colors.background.primary,
                  transform: [{ translateX: slideAnim }],
                }
              ]}
            >
              {/* Menu header */}
              <View style={[styles.menuHeader, { borderBottomColor: theme.colors.border.light }]}>
                <Logo isMobile={isMobile} isMenu={true} />

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.colors.background.secondary }]}
                  onPress={closeMobileMenu}
                >
                  <Text variant="body1" color="primary" style={styles.closeIcon}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Menu links */}
              <View style={styles.menuLinks}>
                {/* City Selector for Mobile */}
                <TouchableOpacity
                  style={[styles.sideNavLinkRow, {
                    borderBottomColor: theme.colors.border.light,
                  }]}
                  onPress={handleCityPickerOpen}
                >
                  <View style={styles.cityMenuRow}>
                    <Text variant="caption" style={styles.cityMenuEmoji}>📍</Text>
                    <Text 
                      variant="body1" 
                      color="primary" 
                      style={styles.cityMenuText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayCity}
                    </Text>
                  </View>
                  <Text variant="body2" color="secondary" style={styles.chevron}>›</Text>
                </TouchableOpacity>
                
                {navLinks.map((link) => (
                  <TouchableOpacity
                    key={link}
                    style={[styles.sideNavLink, {
                      borderBottomColor: theme.colors.border.light,
                    }]}
                    onPress={() => handleNavLinkPress(link)}
                  >
                    <Text variant="body1" color="secondary" style={styles.sideNavLinkText}>
                      {link}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
            
            {/* Background overlay */}
            <Pressable 
              style={styles.overlayBackground} 
              onPress={closeMobileMenu}
            />
          </View>
        </Modal>
      )}

      <ProfileModal
        visible={showProfileModal}
        onClose={handleCloseProfile}
      />

      {/* City Picker Modal - Available to all users */}
      {showCityPicker && (
        <CityPicker
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
          onClose={handleCityPickerClose}
          initiallyOpen={true}
          showTrigger={false}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
    fontWeight: '600',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileText: {
    fontWeight: '600',
  },
  // Side Modal Styles
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align to left
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sideMenu: {
    width: 250,
    height: '100%',
    position: 'absolute', // Position absolutely on the left
    left: 0,
    top: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuLinks: {
    flex: 1,
    paddingTop: 20,
  },
  sideNavLink: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sideNavLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sideNavLinkText: {
    fontWeight: '500',
    fontSize: 16,
  },
  // City Badge Styles
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  cityText: {
    fontWeight: '600',
    fontSize: 13,
  },
  cityArrow: {
    fontSize: 10,
  },
  // City Menu Styles (Mobile)
  cityMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0, // Allow flex shrinking
    overflow: 'hidden', // Prevent content from expanding
  },
  cityMenuEmoji: {
    fontSize: 16,
    flexShrink: 0, // Don't shrink the emoji
    width: 20, // Fixed width to prevent layout shifts
  },
  cityMenuText: {
    fontWeight: '500',
    fontSize: 16,
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  chevron: {
    flexShrink: 0, // Don't shrink the chevron
    marginLeft: 8,
    width: 20, // Fixed width for chevron
    textAlign: 'right',
  },
  // Deprecated mobile menu styles (keeping for now in case of rollback)
  mobileMenu: {
    marginTop: 16,
    borderTopWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    zIndex: 1001,
  },
  mobileNavLink: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  mobileNavLinkText: {
    fontWeight: '500',
  },
});