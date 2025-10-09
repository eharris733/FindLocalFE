import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Modal, Animated, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import ProfileModal from './ProfileModal';
import {useDeviceInfo} from "../hooks/useDeviceInfo";
import {Logo} from "./ui/Logo";
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';

interface TopNavigationProps {
  onNavLinkPress?: (link: string) => void;
}

export default function TopNavigation({ onNavLinkPress }: TopNavigationProps) {
  const { theme } = useTheme();
  const {isMobile} = useDeviceInfo();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
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
          {/* Left section - Mobile menu button */}
          <View style={styles.leftSection}>
            {isMobile && (
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={handleMobileMenuPress}
              >
                <Text variant="body1" color="primary" style={styles.menuIcon}>
                  {showMobileMenu ? '✕' : '☰'}
                </Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  roomy: {
    paddingVertical: 16,
  },
  condensed: {
    paddingVertical: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
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
  sideNavLinkText: {
    fontWeight: '500',
    fontSize: 16,
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