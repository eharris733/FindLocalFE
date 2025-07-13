import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import ProfileModal from './ProfileModal';

interface TopNavigationProps {
  onNavLinkPress?: (link: string) => void;
}

export default function TopNavigation({ onNavLinkPress }: TopNavigationProps) {
  const { theme } = useTheme();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const navLinks = ['About', 'Friends', 'Support'];

  const handleProfilePress = () => {
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  return (
    <>
      <View style={[styles.container, { 
        backgroundColor: theme.colors.background.primary,
        borderBottomColor: theme.colors.border.light,
        ...theme.shadows.small,
      }]}>
        <View style={styles.content}>
          {/* Left spacer for centering logo */}
          <View style={styles.leftSection} />
          
          {/* Centered Logo - Made bigger */}
          <View style={styles.centerSection}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {/* Right section with nav links and profile */}
          <View style={styles.rightSection}>
            {Platform.OS === 'web' && (
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
                Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ProfileModal
        visible={showProfileModal}
        onClose={handleCloseProfile}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16, // Increased padding for bigger logo
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60, // Increased min height
  },
  leftSection: {
    flex: 1,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  logo: {
    height: 60, // Increased from 40 to 60
    width: 240, // Increased from 160 to 240
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
});