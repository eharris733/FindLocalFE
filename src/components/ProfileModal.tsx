import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text, Card, Button, CityPicker } from './ui';
import { ThemeToggle } from './ui/ThemeToggle';
import { useCityLocation } from "../context/CityContext";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from 'expo-router';
import SignOutButton from './user/SignOutButton';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { theme } = useTheme();
  const { selectedCity, displayCity, onCityChange } = useCityLocation();
  const { isLoggedIn, profile, session } = useAuth();
  const router = useRouter();

  // Format display city for the default location
  const formatLocationDisplay = (city: string) => {
    if (city === 'New York') return 'New York, NY';
    if (city === 'Boston') return 'Boston, MA';
    if (city === 'Brooklyn') return 'Brooklyn, NY';
    if (city === 'Manhattan') return 'Manhattan, NY';
    if (city === 'Queens') return 'Queens, NY';
    if (city === 'Bronx') return 'Bronx, NY';
    if (city === 'Staten Island') return 'Staten Island, NY';
    if (city === 'Back Bay') return 'Back Bay, Boston, MA';
    if (city === 'Cambridge') return 'Cambridge, MA';
    if (city === 'Allston') return 'Allston, Boston, MA';
    if (city === 'South End') return 'South End, Boston, MA';
    if (city === 'North End') return 'North End, Boston, MA';
    if (city === 'Fenway') return 'Fenway, Boston, MA';
    return city; // fallback for other cities
  };

  const handleSignInPress = () => {
    onClose();
    router.push('/user/signin');
  };

  const handleSignUpPress = () => {
    onClose();
    router.push('/user/signup');
  };

  const handleTermsPress = () => {
    onClose();
    router.push('/terms');
  };

  const handlePrivacyPress = () => {
    onClose();
    router.push('/privacy');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
          <Text variant="h2" style={styles.title}>
            Account & Settings
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text variant="h3" color="secondary">
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Section - Show based on auth state */}
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Profile
            </Text>
            <View style={styles.profileInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
                <Text variant="h2" color="primary">
                  {isLoggedIn ? '👤' : '🔓'}
                </Text>
              </View>
              <View style={styles.profileText}>
                {isLoggedIn ? (
                  <>
                    <Text variant="h5">{profile?.full_name || 'User'}</Text>
                    <Text variant="body2" color="secondary">
                      {session?.user?.email}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text variant="h5">Guest User</Text>
                    <Text variant="body2" color="secondary">
                      Sign in to save favorites and get personalized recommendations
                    </Text>
                  </>
                )}
              </View>
            </View>
            {isLoggedIn ? (
              <View style={styles.authButtonContainer}>
                <SignOutButton />
              </View>
            ) : (
              <View style={styles.authButtonContainer}>
                <Button 
                  variant="primary" 
                  style={styles.authButton} 
                  title="Sign In" 
                  onPress={handleSignInPress}
                />
                <Button 
                  variant="outline" 
                  style={styles.authButton} 
                  title="Sign Up" 
                  onPress={handleSignUpPress}
                />
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Select Your City
            </Text>
            <CityPicker
              selectedCity={displayCity}
              onCityChange={onCityChange}
            />
          </Card>

          {/* Appearance Section */}
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Appearance
            </Text>
            <View style={styles.themeSection}>
              <View style={styles.themeLabelContainer}>
                <Text variant="body1">Theme</Text>
                <Text variant="body2" color="secondary">
                  Choose how FindLocal looks to you
                </Text>
              </View>
              <ThemeToggle showLabel={true} />
            </View>
          </Card>

          {/* Preferences Section - Only keeping Default Location */}
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Preferences
            </Text>
            <View style={styles.preferenceItem}>
              <Text variant="body1">Default Location</Text>
              <Text variant="body2" color="secondary">
                {formatLocationDisplay(displayCity)}
              </Text>
            </View>
          </Card>

          {/* Beta Tester Section */}
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Help Us Improve
            </Text>
            <View style={styles.betaSection}>
              <Text variant="body1" style={styles.betaTitle}>
                Become a Beta Tester
              </Text>
              <Text variant="body2" color="secondary" style={styles.betaDescription}>
                Fill out this form to get on the email list and get notified about updates and perks for beta testers!
              </Text>
              <Button
                variant="primary"
                style={styles.betaButton}
                title="Sign Up for Beta Testing"
                onPress={() => Linking.openURL('https://forms.gle/diBZKyejuUXsdQu46')}
              />
            </View>
          </Card>

          {/* Legal Section */}
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Legal
            </Text>
            <TouchableOpacity 
              style={[styles.legalItem, { borderBottomColor: theme.colors.border.light }]}
              onPress={handleTermsPress}
            >
              <Text variant="body1">Terms of Service</Text>
              <Text variant="body2" color="secondary">›</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.legalItem}
              onPress={handlePrivacyPress}
            >
              <Text variant="body1">Privacy Policy</Text>
              <Text variant="body2" color="secondary">›</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  authButtonContainer: {
    gap: 8,
  },
  authButton: {
    marginTop: 4,
  },
  themeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  betaSection: {
    alignItems: 'flex-start',
  },
  betaTitle: {
    marginBottom: 8,
  },
  betaDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  betaButton: {
    alignSelf: 'stretch',
  },
  legalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});