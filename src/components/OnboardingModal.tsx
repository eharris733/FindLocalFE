import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import { useCommunity } from '../context/CommunityContext';
import { useCityLocation } from '../context/CityContext';
import { useRouter } from 'expo-router';
import AppleSignInButton from './user/AppleSignInButton';
import GoogleSignInButton from './user/GoogleSignInButton';
import { STORAGE_KEYS } from '../constants/storage-keys'; 

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (selectedInterests?: string[]) => void;
}

const AVAILABLE_CITIES = ['Boston', 'New York'];

export default function OnboardingModal({ visible, onComplete }: Readonly<OnboardingModalProps>) {
  const { theme } = useTheme();
  const { allCommunities, onCommunitiesChange, onCityChange: onCommunityCityChange } = useCommunity();
  const { onCityChange: onCityLocationChange } = useCityLocation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCity, setSelectedCity] = useState<string>('Boston');
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    // During onboarding, just update local state - don't trigger data fetches
  };

  const handleCommunityToggle = (communityName: string) => {
    setSelectedCommunityIds(prev => {
      const newSelection = prev.includes(communityName)
        ? prev.filter(id => id !== communityName)
        : [...prev, communityName];

      // During onboarding, just update local state - don't trigger data fetches
      return newSelection;
    });
  };

  const handleNext = async () => {
    if (step === 1) {
      // City is already saved when selected, just move to next step
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    // When skipping interests, save city and complete with empty interests
    setStep(3);
  };

  // Common function to save onboarding preferences
  const saveOnboardingPreferences = async (skipContextUpdate = false) => {
    // Save preferences to AsyncStorage
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PREFERRED_CITY, selectedCity],
      [STORAGE_KEYS.SELECTED_INTERESTS, JSON.stringify(selectedCommunityIds)],
      [STORAGE_KEYS.ONBOARDING_COMPLETED, 'true'],
    ]);

    // For OAuth flows (Apple, Google), skip context updates as the app will reload
    // and contexts will load preferences from AsyncStorage on mount
    if (!skipContextUpdate) {
      // Trigger data loading by updating contexts (for guest/email signup flows)
      await Promise.all([
        onCityLocationChange(selectedCity),
        onCommunityCityChange(selectedCity),
        onCommunitiesChange(selectedCommunityIds),
      ]);
    }
  };

  const handleAppleSignInSuccess = async () => {
    // Save preferences BEFORE OAuth redirect to prevent modal from showing again
    // Skip context updates since app will reload after OAuth and load from AsyncStorage
    await saveOnboardingPreferences(true);
    // Call onComplete to close the modal
    onComplete(selectedCommunityIds);
  };

  const handleAppleSignInError = (error: string) => {
    setFeedback(error);
  };

  const handleCreateAccount = async () => {
    // Save preferences before navigating to signup page
    await saveOnboardingPreferences();
    // Close modal first, then navigate
    onComplete(selectedCommunityIds);
    // Navigate after a brief delay to ensure modal is closed
    setTimeout(() => {
      router.push('/user/signup');
    }, 100);
  };

  const handleContinueAsGuest = async () => {
    await saveOnboardingPreferences();
    onComplete(selectedCommunityIds);
  };

  const canProceed = step === 1 ? !!selectedCity : true;

  const getHeaderTitle = () => {
    if (step === 1) return 'Welcome to FindLocal!';
    if (step === 2) return 'Choose your community';
    return 'Ready to explore?';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={() => {}} />
        
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
            {/* Navigation buttons */}
            <View style={styles.headerNav}>
              {step > 1 ? (
                <TouchableOpacity onPress={handleBack} style={styles.navButton}>
                  <Text variant="body2" color="secondary">← Back</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.navButton} />
              )}
              
              {step === 2 ? (
                <TouchableOpacity onPress={handleSkip} style={styles.navButton}>
                  <Text variant="body2" color="secondary">Skip →</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.navButton} />
              )}
            </View>
            
            <Text variant="h3" color="primary" style={styles.headerTitle}>
              {getHeaderTitle()}
            </Text>
            <View style={styles.stepIndicator}>
              {[1, 2, 3].map(s => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    s === step && { backgroundColor: theme.colors.primary[600] },
                    s !== step && { backgroundColor: theme.colors.border.light }
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <View>
                <Text variant="body2" color="secondary" style={styles.description}>
                  Select your city to discover local events
                </Text>
                <View style={styles.cityOptions}>
                  {AVAILABLE_CITIES.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityButton,
                        {
                          backgroundColor: selectedCity === city 
                            ? theme.colors.primary[100]
                            : theme.colors.background.secondary,
                          borderColor: selectedCity === city
                            ? theme.colors.primary[600]
                            : theme.colors.border.light,
                        }
                      ]}
                      onPress={() => handleCitySelect(city)}
                    >
                      <Text
                        variant="body1"
                        style={{
                          color: selectedCity === city
                            ? theme.colors.primary[700]
                            : theme.colors.text.secondary,
                          fontWeight: selectedCity === city ? '600' : '500',
                        }}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {step === 2 && (
              <View>
                <Text variant="body2" color="secondary" style={styles.description}>
                  Select the communities you're interested in (or skip to see everything)
                </Text>
                <View style={styles.interestsGrid}>
                  {allCommunities.map(community => {
                    const isSelected = selectedCommunityIds.includes(community.name);
                    return (
                      <TouchableOpacity
                        key={community.id}
                        style={[
                          styles.interestButton,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary[100]
                              : theme.colors.background.secondary,
                            borderColor: isSelected
                              ? community.metadata.color
                              : theme.colors.border.light,
                            borderLeftWidth: isSelected ? 4 : 2,
                          }
                        ]}
                        onPress={() => handleCommunityToggle(community.name)}
                      >
                        <Text variant="h4" style={{ fontSize: 24, marginBottom: 2 }}>
                          {community.metadata.icon}
                        </Text>
                        <Text
                          variant="body2"
                          style={{
                            color: isSelected
                              ? theme.colors.primary[700]
                              : theme.colors.text.primary,
                            fontWeight: isSelected ? '600' : '500',
                            fontSize: 13,
                            textAlign: 'center',
                          }}
                        >
                          {community.name}
                        </Text>
                        {community.description ? (
                          <Text
                            variant="caption"
                            style={{
                              color: isSelected
                                ? theme.colors.primary[700]
                                : theme.colors.text.tertiary,
                              marginTop: 1,
                              fontSize: 10,
                              textAlign: 'center',
                            }}
                          >
                            {community.description}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {step === 3 && (
              <View>
                {feedback && (
                  <View style={[styles.feedbackContainer, { 
                    backgroundColor: theme.colors.background.secondary,
                    borderLeftColor: theme.colors.info,
                    marginBottom: 16,
                  }]}>
                    <Text variant="body2" style={{ color: theme.colors.text.primary }}>
                      {feedback}
                    </Text>
                  </View>
                )}
                <Text variant="body2" color="secondary" style={styles.description}>
                  Create an account to save your preferences and favorite events
                </Text>
                <View style={styles.accountOptions}>
                  <GoogleSignInButton
                    onSuccess={handleAppleSignInSuccess}
                    onError={handleAppleSignInError}
                    setLoading={setLoading}
                  />

                  <AppleSignInButton
                    onSuccess={handleAppleSignInSuccess}
                    onError={handleAppleSignInError}
                    setLoading={setLoading}
                  />

                  <TouchableOpacity
                    style={[
                      styles.accountButton,
                      {
                        backgroundColor: theme.colors.background.secondary,
                        borderColor: theme.colors.border.light,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={handleCreateAccount}
                    disabled={loading}
                  >
                    <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600', fontSize: 15 }}>
                      Sign up with Email
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.guestButton}
                    onPress={handleContinueAsGuest}
                  >
                    <Text variant="body2" color="tertiary" style={{ fontWeight: '500' }}>
                      Continue as Guest
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {step < 3 && (
            <View style={[styles.footer, { borderTopColor: theme.colors.border.light }]}>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: canProceed
                      ? theme.colors.primary[600]
                      : theme.colors.background.secondary,
                  }
                ]}
                onPress={handleNext}
                disabled={!canProceed}
              >
                <Text
                  variant="body2"
                  style={{
                    color: canProceed ? '#fff' : theme.colors.text.tertiary,
                    fontWeight: '600',
                  }}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    minWidth: 60,
  },
  headerTitle: {
    marginBottom: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 16,
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  cityOptions: {
    gap: 12,
  },
  cityButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    gap: 10,
  },
  interestButton: {
    width: '48%', // 2 columns
    padding: 8,
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountOptions: {
    gap: 12,
  },
  accountButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    padding: 14,
  },
  guestButton: {
    padding: 12,
    alignItems: 'center',
  },
  feedbackContainer: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
  },
});
