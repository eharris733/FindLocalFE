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
import {Text, Card, Button, CityPicker} from './ui';
import { ThemeToggle } from './ui/ThemeToggle';
import {useCityLocation} from "../context/CityContext";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { theme } = useTheme();
  const {selectedCity, displayCity, onCityChange} = useCityLocation();
  
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
          {/* Commented out Profile section - not needed for beta
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Profile
            </Text>
            <View style={styles.profileInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
                <Text variant="h2" color="primary">
                  👤
                </Text>
              </View>
              <View style={styles.profileText}>
                <Text variant="h5">Guest User</Text>
                <Text variant="body2" color="secondary">
                  Sign in to save favorites and get personalized recommendations
                </Text>
              </View>
            </View>
            <Button variant="primary" style={styles.signInButton} title="Sign In" />
          </Card>
          */}

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
            {/* Commented out Notification Settings - not implemented yet
            <View style={styles.preferenceItem}>
              <Text variant="body1">Notification Settings</Text>
              <Text variant="body2" color="secondary">
                Get notified about new events
              </Text>
            </View>
            */}
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

          {/* Commented out Support Section - not needed for beta
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Support
            </Text>
            <TouchableOpacity style={styles.supportItem}>
              <Text variant="body1">Help & FAQ</Text>
              <Text variant="body2" color="secondary">
                →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportItem}>
              <Text variant="body1">Contact Us</Text>
              <Text variant="body2" color="secondary">
                →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportItem}>
              <Text variant="body1">Privacy Policy</Text>
              <Text variant="body2" color="secondary">
                →
              </Text>
            </TouchableOpacity>
          </Card>
          */}
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
  signInButton: {
    marginTop: 8,
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
});