import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';

const FEEDBACK_BANNER_DISMISSED_KEY = 'feedbackBannerDismissed';
const RESET_HOURS = 24; // Show banner again after 24 hours

interface FeedbackBannerProps {
  readonly onFeedbackPress: () => void;
}

export default function FeedbackBanner({ onFeedbackPress }: FeedbackBannerProps) {
  const { isLoggedIn } = useAuth();
  const [isDismissed, setIsDismissed] = useState(true); // Start as dismissed to avoid flash

  useEffect(() => {
    checkDismissedStatus();
  }, []);

  const checkDismissedStatus = async () => {
    try {
      const dismissedTimestamp = await AsyncStorage.getItem(FEEDBACK_BANNER_DISMISSED_KEY);
      
      if (!dismissedTimestamp) {
        // Never dismissed before - show the banner
        setIsDismissed(false);
        return;
      }
      
      const dismissedDate = Number.parseInt(dismissedTimestamp, 10);
      const hoursSinceDismissal = (Date.now() - dismissedDate) / (1000 * 60 * 60);
      
      // Show banner again if enough time has passed
      setIsDismissed(hoursSinceDismissal < RESET_HOURS);
    } catch (error) {
      console.error('Error checking feedback banner status:', error);
      setIsDismissed(false);
    }
  };

  const handleDismiss = async () => {
    try {
      // Store current timestamp
      await AsyncStorage.setItem(FEEDBACK_BANNER_DISMISSED_KEY, Date.now().toString());
      setIsDismissed(true);
    } catch (error) {
      console.error('Error dismissing feedback banner:', error);
    }
  };

  // Only show banner for logged-in users
  if (!isLoggedIn || isDismissed) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#f97316', // Orange color
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text variant="body2" style={styles.text}>
            Help us improve by sharing your thoughts.
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.feedbackButton, { backgroundColor: 'white' }]}
            onPress={onFeedbackPress}
            activeOpacity={0.8}
          >
            <Text variant="body2" style={styles.feedbackButtonText}>
              Give Feedback
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text variant="body1" style={styles.closeButtonText}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: 'white',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  feedbackButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  feedbackButtonText: {
    color: '#f97316',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
