import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Text, Card, Button, CityPicker } from './ui';
import { ThemeToggle } from './ui/ThemeToggle';
import { useCityLocation } from "../context/CityContext";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from 'expo-router';
import SignOutButton from './user/SignOutButton';
import { updateMarketingOptIn, deleteUserAccount } from '../api/profiles';

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
    if (Platform.OS === 'web') {
      window.open('/terms', '_blank');
    } else {
      onClose();
      router.push('/terms');
    }
  };

  const handlePrivacyPress = () => {
    if (Platform.OS === 'web') {
      window.open('/privacy', '_blank');
    } else {
      onClose();
      router.push('/privacy');
    }
  };

  const [showCityPicker, setShowCityPicker] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [updatingOptIn, setUpdatingOptIn] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Load marketing opt-in state from profile
  useEffect(() => {
    if (profile?.marketing_opt_in !== undefined && profile?.marketing_opt_in !== null) {
      setMarketingOptIn(profile.marketing_opt_in);
    }
  }, [profile]);

  const handleCityPickerOpen = () => {
    setShowCityPicker(true);
  };

  const handleCityPickerClose = () => {
    setShowCityPicker(false);
  };

  const handleCityChange = (city: string) => {
    onCityChange(city);
    setShowCityPicker(false);
  };

  const handleMarketingOptInToggle = async () => {
    if (!session?.user?.id) return;

    const newValue = !marketingOptIn;
    setMarketingOptIn(newValue);
    setUpdatingOptIn(true);

    try {
      const { error } = await updateMarketingOptIn(session.user.id, newValue);
      if (error) {
        console.error('Error updating marketing opt-in:', error);
        // Revert on error
        setMarketingOptIn(!newValue);
      }
    } catch (err) {
      console.error('Error updating marketing opt-in:', err);
      // Revert on error
      setMarketingOptIn(!newValue);
    } finally {
      setUpdatingOptIn(false);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      // Use browser confirm dialog on web
      const confirmed = window.confirm(
        'Delete Account\n\n' +
        'Are you absolutely sure you want to delete your account?\n\n' +
        'This action cannot be undone. All your data including:\n' +
        '• Your profile information\n' +
        '• Saved favorites\n' +
        '• Preferences and settings\n\n' +
        'will be permanently deleted.\n\n' +
        'Do you want to continue?'
      );
      
      if (confirmed) {
        confirmDeleteAccount();
      }
    } else {
      // Use React Native Alert on mobile
      Alert.alert(
        'Delete Account',
        'Are you absolutely sure you want to delete your account?\n\n' +
        'This action cannot be undone. All your data including:\n' +
        '• Your profile information\n' +
        '• Saved favorites\n' +
        '• Preferences and settings\n\n' +
        'will be permanently deleted.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete Account',
            style: 'destructive',
            onPress: confirmDeleteAccount,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const confirmDeleteAccount = async () => {
    if (!session?.user?.id) return;

    setDeletingAccount(true);

    try {
      const { success, error } = await deleteUserAccount(session.user.id);

      if (error || !success) {
        console.error('Error deleting account:', error);
        
        if (Platform.OS === 'web') {
          window.alert('Failed to delete account. Please try again or contact support.');
        } else {
          Alert.alert(
            'Error',
            'Failed to delete account. Please try again or contact support.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      // Success - user is signed out and redirected by the deleteUserAccount function
      if (Platform.OS === 'web') {
        window.alert('Your account has been successfully deleted.');
      } else {
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      }
      
      // Close modal and redirect to home
      onClose();
      router.replace('/');
    } catch (err) {
      console.error('Error in confirmDeleteAccount:', err);
      
      if (Platform.OS === 'web') {
        window.alert('An unexpected error occurred. Please try again.');
      } else {
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setDeletingAccount(false);
    }
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
            <Ionicons name="close" size={28} color={theme.colors.text.secondary} />
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

          {/* Preferences Section - Combined City Picker and Default Location */}
          <Card style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Preferences
            </Text>
            <View style={styles.preferenceSection}>
              <Text variant="body1" style={styles.preferenceLabel}>Default Location</Text>
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
            </View>

            {/* Email Preferences - Only show for logged in users */}
            {isLoggedIn && (
              <View style={[styles.preferenceSection, { marginTop: 20 }]}>
                <Text variant="body1" style={styles.preferenceLabel}>Email Preferences</Text>
                <TouchableOpacity 
                  style={styles.checkboxRow}
                  onPress={handleMarketingOptInToggle}
                  activeOpacity={0.7}
                  disabled={updatingOptIn}
                >
                  <View style={[
                    styles.checkbox, 
                    { borderColor: theme.colors.border.light },
                    marketingOptIn && [styles.checkboxChecked, { backgroundColor: theme.colors.primary[500] }]
                  ]}>
                    {marketingOptIn && (
                      <View style={[styles.checkboxInner, { backgroundColor: theme.colors.background.primary }]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body2" style={styles.checkboxLabel}>
                      Send me personalized event recommendations and FindLocal updates
                    </Text>
                  </View>
                  {updatingOptIn && (
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* City Picker Modal */}
          {showCityPicker && (
            <CityPicker
              selectedCity={displayCity}
              onCityChange={handleCityChange}
              showTrigger={false}
              initiallyOpen={true}
              onClose={handleCityPickerClose}
            />
          )}

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
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.legalItem}
              onPress={handlePrivacyPress}
            >
              <Text variant="body1">Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </Card>

          {/* Account Deletion Section - Only show for logged in users */}
          {isLoggedIn && (
            <Card style={[styles.section, { borderColor: theme.colors.error, borderWidth: 1 }]}>
              <Text variant="h4" style={[styles.sectionTitle, { color: theme.colors.error }]}>
                Danger Zone
              </Text>
              <Text variant="body2" color="secondary" style={{ marginBottom: 16, lineHeight: 20 }}>
                Once you delete your account, there is no going back. All your data will be permanently deleted.
              </Text>
              <Button
                variant="outline"
                title={deletingAccount ? "Deleting..." : "Delete Account"}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
                style={[styles.deleteButton, { borderColor: theme.colors.error }]}
              />
              {deletingAccount && (
                <View style={styles.deletingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.error} />
                  <Text variant="body2" color="secondary" style={{ marginLeft: 8 }}>
                    Deleting your account...
                  </Text>
                </View>
              )}
            </Card>
          )}
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
  preferenceSection: {
    gap: 8,
  },
  preferenceLabel: {
    fontWeight: '500',
    marginBottom: 8,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  cityText: {
    fontWeight: '600',
  },
  cityArrow: {
    fontSize: 10,
    marginLeft: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 20,
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
  deleteButton: {
    alignSelf: 'stretch',
  },
  deletingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
});